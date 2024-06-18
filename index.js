import { sendMove, myID } from "./myWebsocket.js";

let tableFieldGo;
const sizeField = 9;
let roomID;
export let myColor;

document.querySelector(".formConnect").addEventListener("submit", function (event) {
    event.preventDefault();
    // console.log(event, this);
    roomID = this.roomID.value;
    sendMove({ meta: "connection", roomID, userID: myID, move: "" });
});

export function startGame() {
    const form = document.querySelector(".formConnect");
    form.remove();
    tableFieldGo = createTable();
}

function fillTabelCell(table, size) {
    for (let i = 0; i < size; i++) {
        let tr = table.insertRow();
        for (let i = 0; i < size; i++) {
            const td = tr.insertCell();
            td.classList.add("cell");
            td.addEventListener("click", clickCell);
        }
    }
    return table;
}

export function actionHandler(arrOfAction) {
    console.log("arrOfAction:", arrOfAction);
    for (const act of arrOfAction) {
        switch (act.opName) {
            case "delete":
                deleteCell(act.coord);
                break;
            case "put":
                putCell(act.coord, act.color);
                break;
            case "impossibleMove":
                console.log("Imposible move");
                break;
            default:
                break;
        }
    }
}

function clickCell(event) {
    sendMove({
        meta: "move",
        roomID,
        userID: myID,
        move: [event.target.parentNode.rowIndex, event.target.cellIndex],
    });
}

// [{opName: "delete",coord: [0,1]  },
//     {opName : "delete",coord: [0,2]},
//     {opName: 'put', coord : []}]

function deleteCell(coord) {
    const [row, column] = coord;
    const cell = tableFieldGo.rows[row].cells[column];
    cell.firstChild.remove();
    cell.classList.remove("moonW");
    cell.classList.remove("moonB");
}

function putCell(coord, colorCell) {
    console.log("putCell", coord);
    const [row, column] = coord;
    let typeCell;
    const cell = tableFieldGo.rows[row].cells[column];
    const img = document.createElement("img");
    img.classList.add("table__imgCell");

    if (colorCell === "B") {
        img.src = "./img/moonB.png";
        cell.classList.add("moonB");
        // typeCell = "B";
        // step = "W";
    } else if (colorCell === "W") {
        img.src = "./img/moonW.png";
        cell.classList.add("moonW");
        // typeCell = "W";
        // step = "B";
    }
    cell.append(img);
}

function createTable() {
    const fieldGo = document.querySelector(".field");
    const tableFieldGo = fillTabelCell(document.createElement("table"), sizeField);
    tableFieldGo.classList.add("tableGo");

    fieldGo.append(tableFieldGo);
    return tableFieldGo;
}

export function chengeInfoStep(colorMove) {
    const div = document.querySelector(".infoStep");
    div.innerHTML = `Ход ${colorMove}`;
}
