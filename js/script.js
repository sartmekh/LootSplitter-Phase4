const STORAGE_KEY = 'lootSplitterState';
const STUDENT_ID = 'matviiK';
const SERVER_URL = 'https://goldtop.hopto.org';

let lootItems = [];
let partySize = 1;

let nameInput = document.getElementById('lootName');
let valueInput = document.getElementById('lootValue');
let quantityInput = document.getElementById('lootQuantity');
let inputMessage = document.getElementById('lootMessage');
let partyMessage = document.getElementById('partyMessage');
let sizeInput = document.getElementById('sizeInput');
let noLootMessage = document.getElementById('noLootMessage');
let lootRows = document.getElementById('lootRows');
let listTotalRow = document.getElementById('listTotalRow');
let listTotalSpan = document.getElementById('listTotalValue');
let splitResults = document.getElementById('splitResults');
let splitTotalSpan = document.getElementById('splitTotalValue');
let perPersonSpan = document.getElementById('perPersonValue');
let lootBtn = document.getElementById('lootBtn');
let splitBtn = document.getElementById('splitBtn');
let resetBtn = document.getElementById('resetBtn');
let syncBtn = document.getElementById('syncBtn');
let loadServerBtn = document.getElementById('loadServerBtn');
let serverMessage = document.getElementById('serverMessage');

function getStateObject() {
    return {
        loot: lootItems,
        partySize: partySize
    };
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getStateObject()));
}

function setServerMessage(message, isError) {
    serverMessage.innerText = message;

    if (isError) {
        serverMessage.className = 'server-message error';
    } else {
        serverMessage.className = 'server-message';
    }
}

function validateLootItem(item) {
    if (typeof item !== 'object' || item === null) {
        return null;
    }

    let restoredName = item.name;
    let restoredValue = Number(item.value);
    let restoredQuantity = Number(item.quantity);

    if (typeof restoredName === 'string' && restoredName.trim() !== '' &&
       !isNaN(restoredValue) && restoredValue >= 0 && Number.isInteger(restoredQuantity) && restoredQuantity >= 1) {
        return {
            name: restoredName.trim(),
            value: restoredValue,
            quantity: restoredQuantity
        };
    }

    return null;
}

function validateServerState(state) {
    let validatedLoot = [];

    if (typeof state !== 'object' || state === null || !Array.isArray(state.loot) || !Number.isInteger(Number(state.partySize)) || Number(state.partySize) < 1) {
        return null;
    }

    for (let i = 0; i < state.loot.length; i++) {
        let validItem = validateLootItem(state.loot[i]);

        if (validItem === null) {
            return null;
        }

        validatedLoot.push(validItem);
    }

    return {
        loot: validatedLoot,
        partySize: Number(state.partySize)
    };
}

function restoreState() {
    lootItems = [];
    partySize = 1;

    let savedState = localStorage.getItem(STORAGE_KEY);

    if (savedState === null) {
        sizeInput.value = partySize;
        return;
    }

    try {
        let parsedState = JSON.parse(savedState);

        if (typeof parsedState !== 'object' || parsedState === null || !Array.isArray(parsedState.loot)) {
            sizeInput.value = partySize;
            return;
        }

        if (Number.isInteger(parsedState.partySize) && parsedState.partySize >= 1) {
            partySize = parsedState.partySize;
        }

        for (let i = 0; i < parsedState.loot.length; i++) {
            let restoredItem = validateLootItem(parsedState.loot[i]);

            // entries are validated so damaged storage cannot enter state
            if (restoredItem !== null) {
                lootItems.push(restoredItem);
            }
        }
    } catch (error) {
        lootItems = [];
        partySize = 1;
    }

    sizeInput.value = partySize;
}

function addLoot() {
    let name = nameInput.value.trim();
    let value = Number(valueInput.value);
    let quantity = Number(quantityInput.value);

    // validation is before mutation so data data of invalid form doesn't save or display
    if (name === '' || valueInput.value.trim() === '' || isNaN(value) || value < 0 || !Number.isInteger(quantity) || quantity < 1) {
        inputMessage.innerText = 'Please enter a valid loot name, value, and quantity.';
        return;
    }

    let lootItem = {
        name: name,
        value: value,
        quantity: quantity
    };

    lootItems.push(lootItem);

    nameInput.value = '';
    valueInput.value = '';
    quantityInput.value = '1';
    inputMessage.innerText = `${name} added.`;

    saveState();
    updateUI();
}

function splitLoot() {
    updateUI();
}

function removeLoot(index) {
    let toRemoveIndex = parseInt(index);

    // index is validated before splice so remove only mutates real array items
    if (isNaN(toRemoveIndex) || toRemoveIndex < 0 || toRemoveIndex >= lootItems.length) {
        inputMessage.innerText = 'Please select loot to remove.';
        return;
    }

    let removedLoot = lootItems.splice(toRemoveIndex, 1)[0];
    inputMessage.innerText = `${removedLoot.name} removed.`;

    saveState();
    updateUI();
}

function changePartySize() {
    let nextPartySize = Number(sizeInput.value);

    if (!Number.isInteger(nextPartySize) || nextPartySize < 1) {
        updateUI();
        return;
    }

    partySize = nextPartySize;
    saveState();
    updateUI();
}

function resetAll() {
    lootItems = [];
    partySize = 1;
    sizeInput.value = partySize;
    inputMessage.innerText = 'All saved loot has been reset.';
    partyMessage.innerText = '';
    setServerMessage('', false);

    localStorage.removeItem(STORAGE_KEY);
    updateUI();
}

function syncToServer() {
    let payload = {
        studentId: STUDENT_ID,
        state: getStateObject()
    };

    fetch(`${SERVER_URL}/save/${STUDENT_ID}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Server returned an error while saving.');
            }

            return response.json();
        })
        .then(function (data) {
            if (data.status === 'saved' && data.studentId === STUDENT_ID) {
                setServerMessage('State synced to server successfully.', false);
            } else {
                setServerMessage('Server save response did not match the expected contract.', true);
            }
        })
        .catch(function () {
            setServerMessage('Sync to server failed. Existing loot stayed unchanged.', true);
        });
}

function loadFromServer() {
    fetch(`${SERVER_URL}/load/${STUDENT_ID}`)
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Server returned an error while loading.');
            }

            return response.json();
        })
        .then(function (data) {
            if (data.studentId !== STUDENT_ID) {
                setServerMessage('Server load response used the wrong studentId.', true);
                return;
            }

            if (data.status === 'empty') {
                setServerMessage('No saved server state was found. Current loot stayed unchanged.', true);
                return;
            }

            if (data.status !== 'loaded') {
                setServerMessage('Server load response did not match the expected contract.', true);
                return;
            }

            let validatedState = validateServerState(data.state);

            if (validatedState === null) {
                setServerMessage('Server state failed validation. Current loot stayed unchanged.', true);
                return;
            }

            lootItems = validatedState.loot;
            partySize = validatedState.partySize;
            sizeInput.value = partySize;

            saveState();
            updateUI();
            setServerMessage('State loaded from server successfully.', false);
        })
        .catch(function () {
            setServerMessage('Load from server failed. Existing loot stayed unchanged.', true);
        });
}

function updateUI() {
    // updateUI renders from state only and storage is used by saveState and restoreState.
    let currentPartyInput = Number(sizeInput.value);
    let partyIsValid = Number.isInteger(currentPartyInput) && currentPartyInput >= 1;
    let hasLoot = lootItems.length > 0;
    let totalValue = 0;

    lootRows.innerHTML = '';

    if (hasLoot) {
        noLootMessage.classList.add('hidden');

        // loot array is the used for both rendering and total calculation.
        for (let i = 0; i < lootItems.length; i++) {
            totalValue += lootItems[i].value * lootItems[i].quantity;

            let row = document.createElement('div');
            row.className = 'loot-row';

            let nameCell = document.createElement('div');
            nameCell.className = 'loot-cell';
            nameCell.innerText = lootItems[i].name;

            let valueCell = document.createElement('div');
            valueCell.className = 'loot-cell';
            valueCell.innerText = lootItems[i].value.toFixed(2);

            let quantityCell = document.createElement('div');
            quantityCell.className = 'loot-cell';
            quantityCell.innerText = lootItems[i].quantity;

            let actionCell = document.createElement('div');
            actionCell.className = 'loot-cell loot-actions';

            let removeBtn = document.createElement('button');
            removeBtn.className = 'loot-remove';
            removeBtn.innerText = 'Remove';
            removeBtn.addEventListener('click', function () {
                removeLoot(i);
            });

            actionCell.appendChild(removeBtn);

            row.appendChild(nameCell);
            row.appendChild(valueCell);
            row.appendChild(quantityCell);
            row.appendChild(actionCell);
            lootRows.appendChild(row);
        }
    } else {
        noLootMessage.classList.remove('hidden');
    }

    if (partyIsValid) {
        partyMessage.innerText = '';
    } else {
        partyMessage.innerText = 'Please enter a valid party size.';
    }

    listTotalSpan.innerText = `$${totalValue.toFixed(2)}`;
    splitTotalSpan.innerText = `$${totalValue.toFixed(2)}`;

    if (hasLoot) {
        listTotalRow.classList.remove('hidden');
    } else {
        listTotalRow.classList.add('hidden');
    }

    // results are shown when state is ready for a valid split
    if (hasLoot && partyIsValid) {
        let share = totalValue / partySize;
        perPersonSpan.innerText = `$${share.toFixed(2)}`;
        splitResults.classList.remove('hidden');
        splitBtn.disabled = false;
    } else {
        perPersonSpan.innerText = '$0.00';
        splitResults.classList.add('hidden');
        splitBtn.disabled = true;
    }
}

lootBtn.addEventListener('click', function () {
    addLoot();
});

splitBtn.addEventListener('click', function () {
    splitLoot();
});

resetBtn.addEventListener('click', function () {
    resetAll();
});

syncBtn.addEventListener('click', function () {
    syncToServer();
});

loadServerBtn.addEventListener('click', function () {
    loadFromServer();
});

sizeInput.addEventListener('input', function () {
    changePartySize();
});

restoreState();
updateUI();
