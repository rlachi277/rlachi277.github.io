let s = JSON.stringify(serialize(document.getElementById("body"), true));
console.log(s);
document.querySelector("body").appendChild(deserialize(JSON.parse(s)));