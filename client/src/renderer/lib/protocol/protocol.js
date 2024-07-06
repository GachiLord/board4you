import * as wasm from "./protocol_bg.wasm";
import { __wbg_set_wasm } from "./protocol_bg.js";
__wbg_set_wasm(wasm);
export * from "./protocol_bg.js";

wasm.__wbindgen_start();
