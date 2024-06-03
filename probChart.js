var ctx = document.getElementById("myChart").getContext("2d");
var errText = document.getElementById("err_text");

var appData = {
  minMaxValue: 0.3,
  expectation: 5,
  toAddValue: 0,
  probItems: [],
  calculatedProb: 0,
  calculatedExpectation: 0,
};

var app = new Vue({
  el: "#app",
  data: appData,
  methods: {
    refresh: render,
    addItem: addItem,
    removeItem: removeItem,
    lockItem: lockItem,
    autoLockItem: autoLockItem,
  },
  filters: {
    toFixed: (v, arg) => {
      if (isNaN(v)) {
        return;
      }
      return v.toFixed(arg);
    },
  },
});

var probItemSample = {
  id: "aaa",
  value: 12,
  min_valid_prob: 13,
  max_valid_prob: 15,
  current_prob: 14,
  is_fixed: false,
  fixed_prob: 13.5,
};

var toastTimerId = null;
function showToast(message) {
  errText.innerText = message;
  if (toastTimerId !== null) {
    clearTimeout(toastTimerId);
  }
  toastTimerId = setInterval(() => {
    errText.innerText = "";
  }, 2000);
}

var id = 0;
function uniqueId() {
  id++;
  return id + "";
}

var chartData = {
  labels: [],
  datasets: [
    {
      label: "概率",
      data: [],
      backgroundColor: "rgba(255, 99, 132, 0.2)",
      borderColor: "rgba(255, 99, 132, 1)",
      borderWidth: 1,
    },
  ],
};

var myChart = new Chart(ctx, {
  type: "bar",
  data: chartData,
  options: {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});

function addItem() {
  var newItem = {
    id: uniqueId(),
    value: Number(appData.toAddValue),
    is_fixed: false,
    dom: {},
  };
  appData.probItems.push(newItem);
  console.log("adding item", appData.toAddValue);
  render();
}

function removeItem(idx) {
  appData.probItems.splice(idx, 1);
  render();
}

function autoLockItem(idx) {
  var item = appData.probItems[idx];
  if (isNaN(item.fixed_prob)) {
    showToast("请输入一个数字");
    return;
  }

  item.is_fixed = true;
  lockItem(idx);
}

function lockItem(idx) {
  var item = appData.probItems[idx];
  if (item.is_fixed) {
    if (isNaN(item.fixed_prob)) {
      showToast("请输入一个数字");
      item.is_fixed = false;
      return;
    }

    item.is_fixed = true;
    item.fixed_prob = Number(item.fixed_prob);
  } else {
    item.is_fixed = false;
  }
  render();
}

function calculateMinMax(curV, otherVs, remainExpectation, remainProb) {
  if (otherVs.length == 0) {
    return {
      max_valid_prob: remainProb,
      min_valid_prob: remainProb,
    };
  }
  minFreeValue = Math.min(...otherVs);
  maxFreeValue = Math.max(...otherVs);

  var curAllExpectation = remainProb * curV;
  var minExpectation = minFreeValue * remainProb;
  var maxExpectation = maxFreeValue * remainProb;
  var probDueMax = (remainExpectation - maxExpectation) / (curV - maxFreeValue);
  var probDueMin = (remainExpectation - minExpectation) / (curV - minFreeValue);

  var probItem = {
    max_valid_prob: 0,
    min_valid_prob: 0,
  };
  if (
    minExpectation <= remainExpectation &&
    maxExpectation >= remainExpectation
  ) {
    // 剩余的物品可以正常组合出有效概率，此时最小概率为0
    probItem.min_valid_prob = 0.0;
    if (curAllExpectation == remainExpectation) {
      probItem.max_valid_prob = 1.0;
    } else if (curAllExpectation < remainExpectation) {
      probItem.max_valid_prob = probDueMax;
    } else {
      probItem.max_valid_prob = probDueMin;
    }
  } else if (maxExpectation < remainExpectation) {
    // 剩余物品全部小于预期期望
    if (curAllExpectation == remainExpectation) {
      probItem.max_valid_prob, (probItem.min_valid_prob = 1.0), 1.0;
    } else if (curAllExpectation < remainExpectation) {
      probItem.max_valid_prob, (probItem.min_valid_prob = -1.0), -1.0;
    } else {
      probItem.min_valid_prob = probDueMax;
      probItem.max_valid_prob = probDueMin;
    }
  } else {
    // 剩余物品全部大于预期期望
    if (curAllExpectation == remainExpectation) {
      probItem.max_valid_prob, (probItem.min_valid_prob = 1.0), 1.0;
    } else if (curAllExpectation > remainExpectation) {
      probItem.max_valid_prob, (probItem.min_valid_prob = -1.0), -1.0;
    } else {
      probItem.min_valid_prob = probDueMin;
      probItem.max_valid_prob = probDueMax;
    }
  }
  //  debugger
  probItem.max_valid_prob = Math.min(probItem.max_valid_prob, remainProb);
  probItem.min_valid_prob = Math.max(probItem.min_valid_prob, 0.0);
  probItem.min_valid_prob = Math.min(
    probItem.min_valid_prob,
    probItem.max_valid_prob
  );
  //  debugger
  return probItem;
}

function calculateProb() {
  var totalExpectation = appData.expectation;
  var totalProb = 1.0;
  appData.probItems.forEach((e) => {
    if (e.is_fixed) {
      totalProb -= e.fixed_prob;
      totalExpectation -= e.fixed_prob * e.value;
    }
  });

  for (var i = 0; i < appData.probItems.length; i++) {
    var probItem = appData.probItems[i];

    var freeProbValues = [];
    var freeRemainProbValues = [];
    var freeExpectation = appData.expectation;
    var freeProb = 1.0;

    for (var j = 0; j < appData.probItems.length; j++) {
      if (j == i) {
        continue;
      }
      var otherItem = appData.probItems[j];
      if (otherItem.is_fixed) {
        freeProb -= otherItem.fixed_prob;
        freeExpectation -= otherItem.fixed_prob * otherItem.value;
        continue;
      }
      freeProbValues.push(otherItem.value);
      if (j > i) {
        freeRemainProbValues.push(otherItem.value);
      }
    }

    var freeMinMax = calculateMinMax(
      probItem.value,
      freeProbValues,
      freeExpectation,
      freeProb
    );
    probItem.min_valid_prob = freeMinMax.min_valid_prob;
    probItem.max_valid_prob = freeMinMax.max_valid_prob;

    if (probItem.is_fixed) {
      probItem.current_prob = probItem.fixed_prob;
    } else {
      var remainMinMax = calculateMinMax(
        probItem.value,
        freeRemainProbValues,
        totalExpectation,
        totalProb
      );
      probItem.current_prob =
        remainMinMax.min_valid_prob +
        (remainMinMax.max_valid_prob - remainMinMax.min_valid_prob) *
          appData.minMaxValue;
      //   debugger;
      totalProb -= probItem.current_prob;
      totalExpectation -= probItem.current_prob * probItem.value;
    }
  }
}

function render() {
  calculateProb();
  chartData.labels = appData.probItems.map((v) => "价值:" + v.value);
  chartData.datasets[0].data = appData.probItems.map((v) => v.current_prob);
  appData.calculatedProb = appData.probItems.reduce(
    (acc, v) => acc + v.current_prob,
    0
  );
  appData.calculatedExpectation = appData.probItems.reduce(
    (acc, v) => acc + v.current_prob * v.value,
    0
  );
  console.log(chartData.datasets[0].data);
  myChart.update();
}
