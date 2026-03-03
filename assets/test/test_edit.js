let s = JSON.stringify(serialize(document.getElementById("body"), true));
console.log(s);
deserialize(document.querySelector("body"), JSON.parse(s), true);