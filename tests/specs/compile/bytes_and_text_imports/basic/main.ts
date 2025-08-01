import hello from "./hello_bom.txt" with { type: "text" };
import helloBytes from "./hello_bom.txt" with { type: "bytes" };
import { add } from "./add_bom.ts";
import addBytes from "./add_bom.ts" with { type: "bytes" };
import addText from "./add_bom.ts" with { type: "text" };
import "./lossy.ts";
import invalidUtf8Bytes from "./lossy.ts" with { type: "bytes" };
import invalidUtf8Text from "./lossy.ts" with { type: "text" };
import "http://localhost:4545/run/invalid_utf8.ts";
import remoteInvalidUtf8Bytes from "http://localhost:4545/run/invalid_utf8.ts" with { type: "bytes" };
import removeInvalidUtf8Text from "http://localhost:4545/run/invalid_utf8.ts" with { type: "text" };

console.log(hello, hello.length);
console.log(helloBytes, helloBytes.length);
console.log(addText, addText.length);
console.log(addBytes, addBytes.length);
console.log(invalidUtf8Bytes, invalidUtf8Bytes.length);
console.log(invalidUtf8Text, invalidUtf8Text.length);
console.log(remoteInvalidUtf8Bytes, remoteInvalidUtf8Bytes.length);
console.log(removeInvalidUtf8Text, removeInvalidUtf8Text.length);
console.log(add(1, 2));
