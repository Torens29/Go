// const {startGame} = require("./index.js")
import { startGame, actionHandler, myColor, chengeInfoStep } from "./index.js";

const ws_uri = "ws://127.0.0.1:9600";
const websocket = new WebSocket(ws_uri);
export let myID;

// document.cookie
//     .split(";")
//     .map((e) => e.split("="))
//     .find((e) => e[0] === "userID")?.[1];

function messageAdd(message) {
    const div = document.createElement("div");
    div.innerHTML = message;

    const chatMessages = document.querySelector(".chat");
    chatMessages.prepend(div);
    // chatMessages.insertAdjacentHTML("afterbegin", message);
    // chatMessages.scrollTop = chat_messages.scrollHeight;
}

websocket.onclose = function (event) {
    messageAdd("disconnected");
};

websocket.onerror = function (event) {
    messageAdd("Connection to chat failed");
};

websocket.onopen = function (event) {
    messageAdd("Подсоединился");
};

export function sendMove(move) {
    websocket.send(JSON.stringify(move));
}

// if (myID) startGame();

websocket.onmessage = function (event) {
    let data = JSON.parse(event.data);
    console.log("Answer from server:", data);

    if (data.userID) {
        myID = data.userID;
        document.cookie = `userID=${myID}`;
    } else if (data.message) {
        switch (data.message) {
            case "wait":
                messageAdd("Wait other user");
                break;
            case "start game":
                messageAdd("Starting game...");
                chengeInfoStep("черных");
                startGame();
                break;
            case "full room":
                messageAdd("A full room");
                break;
            case "move other player":
                messageAdd("Ход другого игрока");
                break;
            case "list action":
                const colorMoved = data.colorMove === "B" ? "черных" : "белых";
                const colorWillMove = data.colorMove === "B" ? "белых" : "черных";
                messageAdd(`Ход ${colorMoved}: ${arrToString(data.move)}`);
                chengeInfoStep(colorWillMove);
                actionHandler(data.actions);
                break;
            case "impossible move":
                messageAdd("Такой ход невозможен");
                break;

            default:
                messageAdd("Непонятное сообщение");
        }
    }

    // messageAdd(Object.entries(data));
};

function arrToString(arr) {
    return arr.reduce((str, elem, index) => (index < arr.length - 1 ? `${str}${elem},` : `${str}${elem}`), "");
}
