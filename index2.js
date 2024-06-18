import { myWebsocket } from "./myWebsocket.js";

window.onload = function () {
    const sizeField = 9;
    let step = "B";
    const emptyCell = "+";

    const arrOfField = Array.from({ length: 9 }, () => Array(9).fill(emptyCell)); // Array(sizeField).fill(Array(sizeField).fill("+"))

    let fieldGo = document.querySelector(".field");
    let tableFieldGo = fillTabelCell(document.createElement("table"), sizeField);
    tableFieldGo.classList.add("tableGo");

    fieldGo.append(tableFieldGo);

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

    function clickCell(event) {
        arrOfAction = checkAction(event.target.parentNode.rowIndex, event.target.cellIndex);

        for (act of arrOfAction) {
            switch (act.opName) {
                case "delete":
                    deleteCell(act.coord);
                    break;
                case "put":
                    putCell(act.coord);
                    break;
                case "impossibleMove":
                    console.log("Imposible move");
                    break;
                default:
                    break;
            }
        }
    }
    // [{opName: "delete",coord: [0,1]  },
    //     {opName : "delete",coord: [0,2]},
    //     {opName: 'put', coord : []}]

    function checkAction(row, column) {
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

                        console.log("test", vector, arrToString(vector));
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

            //put
            if (
                arrOfValuesVectorCheck.includes(emptyCell) ||
                arrDelete.length ||
                (arrOfValuesVectorCheck.includes(step) &&
                    arrOfValuesVectorCheck[arrOfFreeCellVectorCheck.indexOf(false)])
            ) {
                arrOfAction.push({
                    opName: "put",
                    coord: [row, column],
                });
                arrOfField[row][column] = step;
            } else arrOfField[row][column] = emptyCell;
        } else {
            arrOfAction.push({
                opName: "impossibleMove",
                coord: [row, column],
            });
        }
        return arrOfAction;
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

    function checkArea(fieldGame, coord) {
        const [y, x] = coord;
        return fieldGame[y] && fieldGame[y][x];
    }

    function deleteCell(coord) {
        [row, column] = coord;
        arrOfField[row][column] = emptyCell;
        const cell = tableFieldGo.rows[row].cells[column];
        console.log(coord, cell, cell.parentNode.rowIndex, cell.cellIndex);
        cell.firstChild.remove();
        cell.classList.remove("moonW");
        cell.classList.remove("moonB");
    }
    function putCell(coord) {
        [row, column] = coord;
        let typeCell = "";
        const cell = tableFieldGo.rows[row].cells[column];
        const img = document.createElement("img");
        img.classList.add("table__imgCell");

        if (step === "B") {
            img.src = "./img/moonB.png";
            cell.classList.add("moonB");
            typeCell = "B";
            step = "W";
        } else if (step === "W") {
            img.src = "./img/moonW.png";
            cell.classList.add("moonW");
            typeCell = "W";
            step = "B";
        }
        cell.append(img);
        arrOfField[row][column] = typeCell;
    }

    function checkEndToNearBorder(arrOfValuesVectorCheck, arrOfFreeCellVectorCheck, oppositeStepColor) {
        return arrOfValuesVectorCheck.some(
            (value, index) => value === oppositeStepColor && !arrOfFreeCellVectorCheck[index] === true
        );
    }
};
