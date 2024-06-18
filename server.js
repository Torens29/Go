const ws = require("ws");
const wss = new ws.Server({ port: 9600 });

const usersID = new Set();
const rooms = {};
const sides = ["B", "W"];
const emptyCell = "+";

console.log("Server start");

wss.on("connection", (socket) => {
    let uuid;
    do {
        uuid = Math.floor(Math.random() * (1000 - 100) + 100);
    } while (usersID.has(uuid));
    usersID.add(uuid);

    socket.send(JSON.stringify({ userID: uuid }));

    socket.on("message", (data) => {
        data = JSON.parse(data);
        console.log("data:", data);
        const { meta, roomID, userID, move } = data;

        switch (meta) {
            case "connection":
                let { room, infoOfRoom } = connectionUser(rooms[roomID], userID, socket);
                rooms[roomID] = room;
                // console.log("Connect:", uuid, "Room:", rooms[roomID], "Info:", infoOfRoom);
                sendActions(rooms[roomID].players, { message: infoOfRoom });
                break;
            case "move":
                const rightMovePlayer = rooms[roomID].players.some(
                    (player) => rooms[roomID].step === player.colorSide && player.uuid === userID
                );
                if (rightMovePlayer) {
                    const actions = checkAction(move, rooms[roomID].arrOfField, rooms[roomID].step);
                    if (actions.length) {
                        chengeField(rooms[roomID].arrOfField, actions, rooms[roomID].step);

                        sendActions(rooms[roomID].players, {
                            message: "list action",
                            colorMove: rooms[roomID].step,
                            move,
                            actions,
                        });
                        rooms[roomID].step = rooms[roomID].step === "B" ? "W" : "B";
                    } else {
                        sendMessThisPleyer(rooms[roomID].players, userID, "impossible move");
                    }
                } else {
                    sendMessThisPleyer(rooms[roomID].players, userID, "move other player");
                }
                break;
            case "leave":
                leave(room);
                break;
        }
    });

    socket.on("close", () => {
        Object.keys(rooms).forEach((room) => leave(room));
    });
});

function sendMessThisPleyer(players, userID, message) {
    const player = players.find((player) => player.uuid === userID);
    sendActions([player], { message });
}

function connectionUser(room, userID, socket) {
    let infoOfRoom;
    // let room;
    if (!room) {
        room = {
            step: "B",
            arrOfField: Array.from({ length: 9 }, () => Array(9).fill(emptyCell)),
            players: [
                {
                    uuid: userID,
                    socket,
                    colorSide: "B",
                },
            ],
        };
        infoOfRoom = "wait";
    } else if (room.players.length === 1 && room.players[0].uuid !== userID) {
        room.players.push({
            uuid: userID,
            socket,
            colorSide: "W",
        });
        infoOfRoom = "start game";
    } else {
        infoOfRoom = "A full room";
    }
    return { room, infoOfRoom };
}

function sendActions(players, actions) {
    for (const player of players) {
        player.socket.send(JSON.stringify(actions));
    }
}

function checkAction(move, arrOfField, step) {
    const [row, column] = move;
    const arrOfAction = [];
    if (arrOfField[row][column] === emptyCell) {
        const arrVectors = [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1],
        ];
        let setCells = new Set();
        let resultOfVectorCheck = {};

        //поиск в ширину

        setCells.add(`${row},${column}`);

        arrVectors.map((vector) => {
            if (arrOfField[row + vector[0]] && arrOfField[row + vector[0]][column + vector[1]]) {
                let checkCell = {
                    coord: [row + vector[0], column + vector[1]],
                    value: arrOfField[row + vector[0]][column + vector[1]],
                    nearFreeCell: false,
                };

                if (checkCell.value === emptyCell) {
                    resultOfVectorCheck[arrToString(vector)] = checkCell;
                } else {
                    const queue = [checkCell];
                    resultOfVectorCheck[arrToString(vector)] = checkCell;

                    // console.log("test", vector, arrToString(vector));
                    while (queue.length && !resultOfVectorCheck[arrToString(vector)].nearFreeCell) {
                        checkCell = queue.pop();
                        arrVectors.map((coordNearCell) => {
                            const y = checkCell.coord[0] + coordNearCell[0];
                            const x = checkCell.coord[1] + coordNearCell[1];

                            if (checkArea(arrOfField, [y, x])) {
                                const nearCell = {
                                    coord: [y, x],
                                    value: arrOfField[y][x],
                                };

                                if (
                                    !setCells.has(arrToString(nearCell.coord)) &&
                                    !resultOfVectorCheck[arrToString(vector)].nearFreeCell
                                ) {
                                    if (nearCell.value === emptyCell) {
                                        resultOfVectorCheck[arrToString(vector)].nearFreeCell = true;
                                    } else if (nearCell.value === checkCell.value) {
                                        queue.push(nearCell);
                                        setCells.add(arrToString(nearCell.coord));
                                    }
                                }
                            }
                        });
                    }
                }
            } else {
                resultOfVectorCheck[arrToString(vector)] = "border";
            }
        });

        const arrResultOfVectorCheck = Object.values(resultOfVectorCheck);
        const arrOfValuesVectorCheck = [];
        const arrOfFreeCellVectorCheck = [];
        for (const resultOfVector of arrResultOfVectorCheck) {
            if (resultOfVector != "border") {
                arrOfValuesVectorCheck.push(resultOfVector.value);
                arrOfFreeCellVectorCheck.push(resultOfVector.nearFreeCell);
            }
        }

        //delete
        arrOfField[row][column] = step;

        let arrDelete = [];
        const oppositeStepColor = step === "B" ? "W" : "B";

        if (
            arrOfValuesVectorCheck.includes(oppositeStepColor) &&
            checkEndToNearBorder(arrOfValuesVectorCheck, arrOfFreeCellVectorCheck, oppositeStepColor)
        ) {
            const arrStartDelete = arrResultOfVectorCheck.filter(
                (elem) => elem.value === oppositeStepColor && !elem.nearFreeCell
            );
            arrDelete = findArrOfDelete(arrStartDelete, arrOfField, oppositeStepColor);

            arrOfAction.push(...arrDelete);
        }
        // del my
        arrOfField[row][column] = emptyCell;

        //put
        if (
            arrOfValuesVectorCheck.includes(emptyCell) ||
            arrDelete.length ||
            (arrOfValuesVectorCheck.includes(step) && arrOfValuesVectorCheck[arrOfFreeCellVectorCheck.indexOf(false)])
        ) {
            arrOfAction.push({
                opName: "put",
                coord: [row, column],
                color: step,
            });
            // arrOfField[row][column] = step;
        } //else arrOfField[row][column] = emptyCell;
    } else {
        arrOfAction.push({
            opName: "impossibleMove",
            coord: [row, column],
        });
    }
    return arrOfAction;
}

function checkArea(fieldGame, coord) {
    const [y, x] = coord;
    return fieldGame[y] && fieldGame[y][x];
}

function checkEndToNearBorder(arrOfValuesVectorCheck, arrOfFreeCellVectorCheck, oppositeStepColor) {
    return arrOfValuesVectorCheck.some(
        (value, index) => value === oppositeStepColor && !arrOfFreeCellVectorCheck[index] === true
    );
}

function arrToString(arr) {
    return arr.reduce((str, elem, index) => (index < arr.length - 1 ? `${str}${elem},` : `${str}${elem}`), "");
}

function findArrOfDelete(arrStartDelete, arrOfField, oppositeStepColor) {
    //{opName: "delete",coord: [0,1]  }
    const arrVectors = [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
    ];
    const arrDelete = [];
    const setCells = new Set();
    const queue = [];
    for (const startDelete of arrStartDelete) {
        if (!setCells.has(arrToString(startDelete.coord))) {
            setCells.add(arrToString(startDelete.coord));
            arrDelete.push({
                opName: "delete",
                coord: startDelete.coord,
            });
            queue.push(startDelete);
            while (queue.length) {
                const checkCell = queue.pop();

                arrVectors.map((coordNearCell) => {
                    const y = checkCell.coord[0] + coordNearCell[0];
                    const x = checkCell.coord[1] + coordNearCell[1];

                    if (checkArea(arrOfField, [y, x])) {
                        const nearCell = {
                            coord: [y, x],
                            value: arrOfField[y][x],
                        };

                        if (!setCells.has(arrToString(nearCell.coord)) && nearCell.value === oppositeStepColor) {
                            queue.push(nearCell);
                            setCells.add(arrToString(nearCell.coord));
                            arrDelete.push({
                                opName: "delete",
                                coord: nearCell.coord,
                            });
                        }
                    }
                });
            }
        }
    }

    return arrDelete;
}

const leave = (room) => {
    if (!rooms[room]) return;
    // if (Object.keys(rooms[room]).length === 1) delete rooms[room];
    else delete rooms[room];
};

function chengeField(arrOfField, actions, typeCellPut) {
    for (act of actions) {
        switch (act.opName) {
            case "delete":
                arrOfField[act.coord[0]][act.coord[1]] = emptyCell;
                break;
            case "put":
                arrOfField[act.coord[0]][act.coord[1]] = typeCellPut;
                break;
            default:
                break;
        }
    }
}
