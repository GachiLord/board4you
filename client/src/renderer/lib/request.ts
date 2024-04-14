export class RequestBuilder {
  public request: RequestInit = {
    headers: {
      'Content-Type': 'application/json'
    }
  }
  public input: RequestInfo | URL;


  constructor(input: RequestInfo | URL) {
    this.input = input
    return this
  }

  async body(body?: object): Promise<any> {
    if (body) this.request.body = JSON.stringify(body)
    const req = await fetch(`${location.origin}/api/${this.input}`, this.request)
    let json: unknown
    try {
      json = await req.json()
    }
    catch {
      req.text()
        .then(t => {
          json = t
        })
        .catch(() => {
          json = {}
        })
    }

    return new Promise((res, rej) => {
      if (req.ok) res(json)
      else return rej(req)
    })

  }

  cache(cache?: RequestCache) {
    this.request.cache = cache
    return this
  }

  credentials(credentials?: RequestCredentials) {
    this.request.credentials = credentials
    return this
  }

  headers(headers?: HeadersInit) {
    this.request.headers = { ...headers }
    return this
  }

  integrity(integrity: string) {
    this.request.integrity = integrity
    return this
  }

  keepalive(keepalive?: boolean) {
    this.request.keepalive = keepalive
    return this
  }

  method(method?: string) {
    this.request.method = method
    return this
  }

  mode(mode?: RequestMode) {
    this.request.mode = mode
    return this
  }
  redirect(redirect?: RequestRedirect) {
    this.request.redirect = redirect
    return this
  }
  referrer(referrer?: string) {
    this.request.referrer = referrer
    return this
  }
  referrerPolicy(referrerPolicy?: ReferrerPolicy) {
    this.request.referrerPolicy = referrerPolicy
    return this
  }
  signal(signal?: AbortSignal | null) {
    this.request.signal = signal
    return signal
  }
  get() {
    this.request.method = 'GET'
    return this
  }
  post() {
    this.request.method = 'POST'
    return this
  }
  put() {
    this.request.method = 'PUT'
    return this
  }
  patch() {
    this.request.method = 'PATCH'
    return this
  }
  delete() {
    this.request.method = 'DELETE'

    return this
  }

}


export function request(input: RequestInfo | URL): RequestBuilder {
  return new RequestBuilder(input)
}
