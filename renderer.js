const edap_lib = require('./bindings.js')
const edap = new edap_lib;

let username = document.querySelector("#username")
let password = document.querySelector("#password")
let loginButton = document.querySelector("#loginButton")
let result = document.querySelector("#result")
loginButton.addEventListener('click', () => {
	let ox = edap.login(username.value, password.value)
	console.log('RecSide: ' + ox)
	result.textContent = ox
})
loginButton.dispatchEvent(new Event('click'))