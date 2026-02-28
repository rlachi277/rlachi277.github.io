let s = JSON.stringify(serialize(document.querySelector("body")));
console.log(s);
document.querySelector("body").appendChild(deserialize(JSON.parse(s)));