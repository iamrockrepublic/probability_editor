var ctx = document.getElementById('myChart').getContext('2d');
var infoContainer = document.getElementById('info-container');
var addContainer = document.getElementById('add-container');
var addBtn = document.getElementById('add_btn');
var addValueInput = document.getElementById('add_value_input');
var errText = document.getElementById('err_text');
var expInput = document.getElementById('expectation_input');
var expCalculated = document.getElementById('calculated_expectation');
var probCalculated = document.getElementById('calculated_prob');

const onEnterTrigger = (f) => {
    return (e) => {if (e.key === 'Enter') {f()}};
};

addBtn.onclick = addInfoItem;
addValueInput.onkeydown = onEnterTrigger(addInfoItem);
expInput.onchange = setExpectation;
expInput.onkeydown = onEnterTrigger(setExpectation);
var expectation = 5;
expInput.value = expectation;
var probItems = [];

var probItemSample = {
    id: "aaa",
    value: 12,
    min_valid_prob: 13,
    max_valid_prob: 15,
    current_prob: 14,
    is_fixed: false,
    fixed_prob: 13.5,
    dom: {}
};

var probItemDOMSample = {
    span: {},
}

var toastTimerId = null;
function showToast(message) {
    errText.innerText = message;
    if (toastTimerId !== null) {
        clearTimeout(toastTimerId);
    }
    toastTimerId = setInterval(()=>{errText.innerText=''}, 2000);
}

var id = 0;
function uniqueId() {
    id ++;
    return id + '';
}

var data = {
    labels: [],
    datasets: [{
        label: '概率',
        data: [],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
    }]
};

var myChart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

function addInfoItem() {
    if (addValueInput.value == '' || isNaN(addValueInput.value)){
        showToast("请输入一个数字");
        return
    }
    if (Number(addValueInput.value) < 0 ) {
        showToast("不能小于0");
        return
    }

    var newItem  = {
        id:uniqueId(),
        value:Number(addValueInput.value),
        is_fixed:false,
        dom: {},
    }
    probItems.push(newItem);
    
    infoContainer.appendChild(newInfoItem(newItem));
    
    addValueInput.value = '';
    render();
}

function removeInfoItem(id) {
    var idx = probItems.findIndex((e) => e.id == id);
    probItems.splice(idx, 1)
    infoContainer.removeChild(document.getElementById("info_" + id));
    render();
}

function autoLockItem(id) {
    var item = probItems.find((e) => e.id == id);
    if (isNaN(item.dom.input.value)){
        showToast("请输入一个数字");
        return
    }

    item.dom.checkbox.checked = true;
    lockItem(id);
}

function lockItem(id) {
    var item = probItems.find((e) => e.id == id);
    if (item.dom.checkbox.checked) {
        if (isNaN(item.dom.input.value)) {
            showToast("请输入一个数字");
            item.dom.checkbox.checked = false;
            return
        }
        
        item.is_fixed = true;
        item.fixed_prob = Number(item.dom.input.value);
    }else {
        item.is_fixed = false;
        item.fixed_prob = 0;
    }
    render();
}

function setExpectation() {
    var v = expInput.value;
    if (v == '' || isNaN(v)) {
        showToast("请输入一个数字");
        expectation = 0;
        return
    }
    expectation = Number(v);
    render();
}

function newInfoItem(item) {
    var newDiv = document.createElement('div');
    newDiv.id = 'info_' + item.id;
    var newSpan = document.createElement('span');
    newSpan.innerText = "价值: "+item.value + " "; 
    var newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.id = 'input_' + item.id;
    newInput.placeholder = '锁定概率';
    newInput.onchange = () => {lockItem(item.id)};
    newInput.onkeydown = onEnterTrigger(()=>{autoLockItem(item.id)});

    var removeBtn = document.createElement('input');
    removeBtn.type = 'button';
    removeBtn.value = '移除';
    removeBtn.onclick = ()=>{
        removeInfoItem(item.id);
    };
    
    var newCheckBox = document.createElement('input');
    newCheckBox.type = 'checkbox';
    newCheckBox.onchange = () => {
        lockItem(item.id);
    };
    var newCheckBoxLabel = document.createElement('label');
    newCheckBoxLabel.innerText = '锁定';


    item.dom.span = newSpan;
    item.dom.checkbox = newCheckBox;
    item.dom.input = newInput;

    newDiv.appendChild(newSpan);
    newDiv.appendChild(newInput);
    newDiv.appendChild(newCheckBox);
    newDiv.appendChild(newCheckBoxLabel);
    newDiv.appendChild(removeBtn);
    return newDiv;
}

function calculateMinMax(curV, otherVs, remainExpectation, remainProb) {
    if (otherVs.length == 0 ) {
        return {
            max_valid_prob:remainProb,
            min_valid_prob:remainProb
        };
    }
    minFreeValue = Math.min(...otherVs);
    maxFreeValue = Math.max(...otherVs);

    var curAllExpectation = remainProb * curV;
    var minExpectation = minFreeValue * remainProb;
    var maxExpectation = maxFreeValue * remainProb; 
    var probDueMax = (remainExpectation - maxExpectation) / (curV - maxFreeValue)
    var probDueMin = (remainExpectation - minExpectation) / (curV - minFreeValue)

    var probItem = {
        max_valid_prob:0,
        min_valid_prob:0
    }
    if ( minExpectation<= remainExpectation && maxExpectation >= remainExpectation) {
        // 剩余的物品可以正常组合出有效概率，此时最小概率为0
        probItem.min_valid_prob = 0.0
        if (curAllExpectation == remainExpectation) {
            probItem.max_valid_prob = 1.0
        }else if (curAllExpectation < remainExpectation) {
            probItem.max_valid_prob = probDueMax
        }else {
            probItem.max_valid_prob = probDueMin
        }
    } else if (maxExpectation < remainExpectation) { // 剩余物品全部小于预期期望
        if (curAllExpectation == remainExpectation) {
            probItem.max_valid_prob, probItem.min_valid_prob = 1.0, 1.0
        }else if (curAllExpectation < remainExpectation) {
            probItem.max_valid_prob, probItem.min_valid_prob = -1.0, -1.0
        }else {
            probItem.min_valid_prob = probDueMax
            probItem.max_valid_prob = probDueMin
        }
    }else { // 剩余物品全部大于预期期望
        if (curAllExpectation == remainExpectation) {
            probItem.max_valid_prob, probItem.min_valid_prob = 1.0, 1.0
        }else if (curAllExpectation > remainExpectation) {
            probItem.max_valid_prob, probItem.min_valid_prob = -1.0, -1.0
        }else {
            probItem.min_valid_prob = probDueMin
            probItem.max_valid_prob = probDueMax
        }
    }
    //  debugger
    probItem.max_valid_prob = Math.min(probItem.max_valid_prob, remainProb);
    probItem.min_valid_prob = Math.max(probItem.min_valid_prob, 0.0);
    probItem.min_valid_prob = Math.min(probItem.min_valid_prob, probItem.max_valid_prob)
    //  debugger
    return probItem
}

function calculateProb() {
    var totalExpectation = expectation;
    var totalProb = 1.0;
    probItems.forEach(e => {
        if (e.is_fixed) {
            totalProb -= e.fixed_prob;
            totalExpectation -= e.fixed_prob * e.value;
        }
    });

    for ( var i = 0; i < probItems.length; i ++) {
        var probItem = probItems[i];
        
        var freeProbValues = [];
        var freeRemainProbValues = [];
        var freeExpectation = expectation;
        var freeProb = 1.0;
    
        
        for ( var j = 0; j < probItems.length; j ++ ) {
            if (j == i) {
                continue;
            }
            var otherItem = probItems[j];
            if (otherItem.is_fixed ) {
                freeProb -= otherItem.fixed_prob;
                freeExpectation -= otherItem.fixed_prob * otherItem.value;
                continue
            }
            freeProbValues.push(otherItem.value);
            if (j > i) {
                freeRemainProbValues.push(otherItem.value);
            }
        }

        var freeMinMax = calculateMinMax(probItem.value, freeProbValues, freeExpectation, freeProb);
        probItem.min_valid_prob = freeMinMax.min_valid_prob
        probItem.max_valid_prob = freeMinMax.max_valid_prob;
        
        if (probItem.is_fixed) {
            probItem.current_prob = probItem.fixed_prob;
        }else {
            var remainMinMax = calculateMinMax(probItem.value, freeRemainProbValues, totalExpectation, totalProb);
            probItem.current_prob = remainMinMax.min_valid_prob + (remainMinMax.max_valid_prob - remainMinMax.min_valid_prob) * 0.3
            // debugger
            totalProb -= probItem.current_prob;
            totalExpectation -= probItem.current_prob * probItem.value;
        }
    }
}

function render() {
    calculateProb();
    updateDOM();
    data.labels = probItems.map((v) => "价值:"+v.value);
    data.datasets[0].data = probItems.map((v)=> v.current_prob);
    probCalculated.innerText = probItems.reduce((acc, v) => acc+v.current_prob, 0).toFixed(4);
    expCalculated.innerText = probItems.reduce((acc, v) => acc+v.current_prob*v.value, 0 ).toFixed(4);
    console.log(data.datasets[0].data);
    myChart.update();
}

function updateDOM() {
    probItems.forEach((e) => {
        e.dom.span.innerText = "价值: "+e.value + " 概率: " + e.current_prob.toFixed(4) + " 有效区间: [" + e.min_valid_prob.toFixed(4) + ', ' + e.max_valid_prob.toFixed(4) + '] '; ;
    });
}