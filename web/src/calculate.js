// 갈 길이 멀고 미완성입니다

calculate = (patientBasicInfo, currMeasureInfo) => {
    let sex = patientBasicInfo.sex;
    let age = patientBasicInfo.age;
    let height = patientBasicInfo.height;
    let weight = patientBasicInfo.weight;
    let BMI = patientBasicInfo.BMI;
    let heartRate = currMeausreInfo.heartRate;
    let temperature = currMeasureInfo.temperature;
    let oxygen = currMeasureInfo.oxygen;

    let checkBPM = BPM();
    let checkTemp = temp(age, temperature);
    let checkSpo2 = spo2();
    let checkFat = fat(BMI);

    return {checkBPM, checkTemp, checkSpo2, checkFat}

}

// 정상 심박수 범위인지
BPM = () => {

}

// 정상 체온인지
temp = (age, temperature) => {

    let low = "저체온입니다.";
    let high = "고체온입니다. (??)";
    let normal = "정상체온입니다.";

    if (age < 1) {
        if (temperature < 37.5) {
            return low;
        } else if (temperature > 37.7) {
            return high;
        } else {
            return normal;
        }
    } else if (age < 3) {
        if (temperature < 36.7) {
            return low;
        } else if (temperature > 37.4) {
            return high;
        } else {
            return normal;
        }
    } else if (age < 6) {
        if (temperature < 36.5) {
            return low;
        } else if (temperature > 37.2) {
            return high;
        } else {
            return normal;
        }
    } else if (age < 65) {
        if (temperature < 36.5) {
            return low;
        } else if (temperature > 37.0) {
            return high;
        } else {
            return normal;
        }
    } else {
        if (temperature < 36.0) {
            return "저체온입니다."
        } else if (temperature > 36.5) {
            return "고체온입니다.(???)"
        } else {
            return "정상 체온입니다."
        }
    }
}

// 정상 산소포화도인지
spo2 = () => {

}

// 정상 BMI인지
fat = (BMI) => {
    if (BMI < 18.5) {
        return "저체중입니다.";
    } else if (BMI < 23) {
        return "정상체중입니다.";
    } else if (BMI < 25) {
        return "과체중입니다.";
    } else {
        return "비만입니다.";
    }
}

// 심전도 (아직 센서 없음)

// 근전도 (아직 센서 없음)

module.exports = {
    calculate
}