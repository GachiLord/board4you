use log::debug;
use std::cmp;
use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::sync::mpsc::{UnboundedReceiver, UnboundedSender};
use tokio::sync::RwLock;
use warp::reject::Rejection;
use warp::Filter;

// consts

const BAN_LIMIT: Duration = Duration::from_secs(10 * 60);
const STRICT_BAN_LIMIT: Duration = Duration::from_secs(24 * 60 * 60);
const MEASURE_RATE: Duration = Duration::from_secs(15);
const REQUEST_LIMIT: u16 = 50;
const MESSAGE_LIMIT: u16 = 3000;
const CRITICAL_BAN_COUNT: usize = 100;
// custom rejection

#[derive(Debug)]
pub struct RateLimit;

impl warp::reject::Reject for RateLimit {}

/// This function checks if user's ip in the ban list.
/// If user is banned it rejects the request
pub fn validate_addr(
    ban_manager_channel: UnboundedSender<ManagerCommand>,
    banned_users: BannedUsers,
) -> impl Filter<Extract = ((),), Error = Rejection> + Clone {
    warp::any()
        .and(warp::any().map(move || ban_manager_channel.clone()))
        .and(warp::any().map(move || banned_users.clone()))
        .and(warp::addr::remote())
        .and_then(
            |ban_manager_channel: UnboundedSender<ManagerCommand>,
             banned_users: BannedUsers,
             addr: Option<SocketAddr>| async move {
                let banned_users = banned_users.read().await;
                match addr {
                    Some(addr) => {
                        // if the user is on the ban list, check if the ban is over
                        if let Some(banned_user) = banned_users.get(&addr.ip()) {
                            debug!("banned user requested with ip: {}", addr);
                            // if not, reject
                            if !banned_user.ban_is_over() {
                                return Err(warp::reject::custom(RateLimit));
                            }
                            debug!("unban user");
                            // otherwise complete the request and send unban message
                            let _ = &ban_manager_channel.send(ManagerCommand::UnbanUser(addr.ip()));
                        } else {
                            // if user wasn't banned, send a request message
                            let _ = &ban_manager_channel
                                .send(ManagerCommand::Action(UserAction::Request(addr.ip())));
                        }
                        return Ok(());
                    }
                    None => return Err(warp::reject::custom(RateLimit)),
                }
            },
        )
}

// ban stuff

pub struct Visitor {
    request_count: u16,
    message_count: u16,
    last_request: SystemTime,
    last_message: SystemTime,
}

pub struct BannedVisitor {
    ban_time: SystemTime,
    strict: bool,
}

impl BannedVisitor {
    fn new(strict: bool) -> Self {
        BannedVisitor {
            ban_time: SystemTime::now(),
            strict,
        }
    }
    pub fn ban_is_over(&self) -> bool {
        let diff = SystemTime::now()
            .duration_since(self.ban_time)
            .unwrap_or(Duration::ZERO);
        let compare_with = if self.strict {
            STRICT_BAN_LIMIT
        } else {
            BAN_LIMIT
        };
        if diff > compare_with {
            return true;
        }
        false
    }
}

pub type RecentVisitors = HashMap<IpAddr, Visitor>;
pub type BannedUsers = Arc<RwLock<HashMap<IpAddr, BannedVisitor>>>;

// ban manager task

pub enum UserAction {
    Request(IpAddr),
    Message(IpAddr),
}

pub enum ManagerCommand {
    Action(UserAction),
    UnbanUser(IpAddr),
}

pub async fn ban_manager(mut rx: UnboundedReceiver<ManagerCommand>, mut banned_users: BannedUsers) {
    let mut recent_visitors = RecentVisitors::new();

    while let Some(cmd) = rx.recv().await {
        match cmd {
            ManagerCommand::Action(action) => {
                if recent_visitors.len() > CRITICAL_BAN_COUNT {
                    clean_up_recent_visitors(&mut recent_visitors);
                }
                visitor_handler(&mut banned_users, &mut recent_visitors, action).await;
            }
            ManagerCommand::UnbanUser(addr) => {
                banned_users.write().await.remove(&addr);
            }
        }
    }
}

async fn visitor_handler(
    banned_users: &mut BannedUsers,
    visitors: &mut RecentVisitors,
    action: UserAction,
) {
    match action {
        UserAction::Request(addr) => {
            let user = visitors.get_mut(&addr);
            if let Some(user) = user {
                let diff = SystemTime::now()
                    .duration_since(user.last_request)
                    .unwrap_or(Duration::ZERO);
                if diff < MEASURE_RATE {
                    (*user).request_count += 1;
                } else {
                    (*user).request_count = 1;
                    user.last_request = SystemTime::now();
                }
                debug!(
                    "checking user with ip: {}, request count: {}",
                    addr, user.request_count
                );
                // check if the request limit was exceeded
                if user.request_count > REQUEST_LIMIT {
                    // ban user
                    let mut banned_users = banned_users.write().await;
                    let banned_count = banned_users.len();
                    banned_users
                        .insert(addr, BannedVisitor::new(banned_count > CRITICAL_BAN_COUNT));
                    debug!("banned user with ip: {}", addr);
                }
            } else {
                visitors.insert(
                    addr,
                    Visitor {
                        message_count: 0,
                        request_count: 1,
                        last_request: SystemTime::now(),
                        last_message: SystemTime::now(),
                    },
                );
            }
        }
        UserAction::Message(addr) => {
            let user = visitors.get_mut(&addr);
            if let Some(user) = user {
                let diff = SystemTime::now()
                    .duration_since(user.last_message)
                    .unwrap_or(Duration::ZERO);
                if diff < MEASURE_RATE {
                    (*user).message_count += 1;
                } else {
                    (*user).message_count = 1;
                    user.last_message = SystemTime::now();
                }
                debug!(
                    "user with ip {} has sent {} messages",
                    addr, user.message_count
                );
                // check if the message limit was exceeded
                if user.message_count > MESSAGE_LIMIT {
                    // ban user
                    debug!("banned user with ip: {}", addr);
                    let mut banned_users = banned_users.write().await;
                    let banned_count = banned_users.len();
                    banned_users
                        .insert(addr, BannedVisitor::new(banned_count > CRITICAL_BAN_COUNT));
                }
            } else {
                visitors.insert(
                    addr,
                    Visitor {
                        message_count: 1,
                        request_count: 0,
                        last_request: SystemTime::now(),
                        last_message: SystemTime::now(),
                    },
                );
            }
        }
    }
}

fn clean_up_recent_visitors(visitors: &mut RecentVisitors) {
    let now = SystemTime::now();
    visitors.retain(|_, visitor| {
        let diff = now
            .duration_since(cmp::max(visitor.last_request, visitor.last_message))
            .unwrap_or(Duration::ZERO);
        diff > MEASURE_RATE
    })
}
