extern crate prost_build;

use std::env;
use std::error::Error;
use std::fs;

const IMPL_IN_FROM_JS: &str = "
    impl From<STRUCT_NAME> for JsValue {
        fn from(val: STRUCT_NAME) -> Self {
            serde_wasm_bindgen::to_value(&val).unwrap()
        }
    }

    impl wasm_bindgen::describe::WasmDescribe for STRUCT_NAME {
        fn describe() {
            JsValue::describe()
        }
    }

    impl wasm_bindgen::convert::IntoWasmAbi for STRUCT_NAME  {
        type Abi = <JsValue as IntoWasmAbi>::Abi;

        fn into_abi(self) -> Self::Abi {
            serde_wasm_bindgen::to_value(&self).unwrap().into_abi()
        }
    }

    impl wasm_bindgen::convert::FromWasmAbi for STRUCT_NAME {
        type Abi = <JsValue as FromWasmAbi>::Abi;

        unsafe fn from_abi(js: Self::Abi) -> Self {
            serde_wasm_bindgen::from_value(JsValue::from_abi(js)).unwrap()
        }
    }
";

const MOD_LIST: [&str; 3] = ["Edit", "Msg", "Msg"];

fn main() -> Result<(), Box<dyn Error>> {
    // generate code from protofiles
    prost_build::compile_protos(&["src/board.proto"], &["src/"])?;
    // add wasm bindgen macro
    let file_path = env::var("OUT_DIR")? + "/board.rs";
    let input = fs::read_to_string(&file_path)?;
    let mut output = String::with_capacity(input.len());
    // set counter for mod sections
    let mut mod_count: usize = 0;

    // add deps imports in the beggining
    output.push_str("use wasm_bindgen::prelude::*;\nuse wasm_bindgen::convert::{FromWasmAbi, IntoWasmAbi};\nuse serde::{Serialize, Deserialize};\n\n");
    // add impl sections for ServerMessage and UserMessage
    output.push_str("// trait impls for ServerMessage and UserMessage\n");
    output.push_str(&IMPL_IN_FROM_JS.replace("STRUCT_NAME", "ServerMessage"));
    output.push_str("\n\n");
    output.push_str(&IMPL_IN_FROM_JS.replace("STRUCT_NAME", "UserMessage"));
    output.push_str("\n\n");
    // start iteration over the file
    for line in input.lines() {
        // add serde traits impls
        let line = line.replace("#[derive(", "#[derive(Serialize, Deserialize, ");

        // add wasm bindgen macro where possible
        let line_has_data_type = line.contains("pub struct ") || line.contains("pub enum ");
        let line_has_copy_data_type = line.contains("Tool ")
            || line.contains("ShapeType ")
            || line.contains("ActionType ")
            || line.contains("EmptyActionType ")
            || line.contains("LineType ");
        if line_has_data_type
            && !line.contains("fn ")
            && !line.contains("Msg ")
            && !line.contains("PullData ")
            && !line.contains("Push ")
            && !line.contains("Edit ")
            && !line.contains("ServerMessage ")
            && !line.contains("UserMessage ")
            && !line.contains("EditData ")
            && !line.contains("PushData ")
            && !line_has_copy_data_type
        {
            output.push_str("#[wasm_bindgen(getter_with_clone)]\n");
        }
        if line_has_data_type && line_has_copy_data_type {
            output.push_str("#[wasm_bindgen]\n");
        }
        // push the line
        output.push_str(&line);
        output.push_str("\n");

        // if we encounter mod section, do deps imports
        if line.contains("mod ") {
            output.push_str("  use serde::{Serialize, Deserialize};\n  use wasm_bindgen::convert::{FromWasmAbi, IntoWasmAbi};\n  use wasm_bindgen::prelude::*;\n\n");
            // because we know that prost library generates rust code with the same order as in our
            // proto-files, we can rely on it when adding impl sections
            output.push_str(&IMPL_IN_FROM_JS.replace("STRUCT_NAME", MOD_LIST[mod_count]));
            mod_count += 1;
        }
    }

    fs::write(&file_path, output)?;

    Ok(())
}
