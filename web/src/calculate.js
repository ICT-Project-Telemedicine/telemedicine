exports.calculate = (patientBasicInfo, currMeasureInfo) => {
    let sex = patientBasicInfo.sex;
    let age = patientBasicInfo.age;
    let height = patientBasicInfo.height;
    let weight = patientBasicInfo.weight;
    let BMI = patientBasicInfo.BMI;
    let heartRate = currMeasureInfo.heartRate;
    let temperature = currMeasureInfo.temperature;
    let oxygen = currMeasureInfo.oxygen;

    let checkBPM = BPM(age, heartRate);
    let checkTemp = temp(age, temperature);
    let checkSpo2 = spo2(oxygen);
    let checkFat = fat(BMI);

    return {checkBPM, checkTemp, checkSpo2, checkFat}
}

// 정상 심박수 범위인지
BPM = (age, heartRate) => {
    let start = ((220 - age) * 0.5).toFixed(2);
    let end = ((220 - age) * 0.7).toFixed(2);

    if (heartRate < start) {
        return "(Low Heart Rate) 심장 판막 또는 전기 시스템 손상, 심장 질환, 만성 또는 전신 감염, 갑상선 문제, 불안장애, 울혈성 심부전증, 빈혈증, 노인성 질환, 저혈압, 약물 부작용, 전해질 불균형, 뇌졸중, 서맥성 부정맥, 빈혈, 갑상선 기능 저하, 혈액순환 장애";
    } else if (end < heartRate) {
        return "(High Heart Rate) 심장 판막 또는 전기 시스템 손상, 심장 질환, 만성 또는 전신 감염, 갑상선 문제, 불안장애, 울혈성 심부전증, 빈혈증, 당뇨, 폐렴, 기립성 빈맥 증후군, 빈맥성 부정맥, 과잉 대사기능상태, 염증 상태, 피의 과잉산성화 상태";
    } else {
        return "(Normal Heart Rate)";
    }

}

// 정상 체온인지
temp = (age, temperature) => {
    let low = "(Low Temperature)";
    let high = "(High Temperature)";
    let normal = "(Normal Temperature)";

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
            return low;
        } else if (temperature > 36.5) {
            return high;
        } else {
            return normal;
        }
    }
}

// 정상 산소포화도인지
spo2 = (oxygen) => {
    if (oxygen < 80) {
        return "(Severe Low Blood Oxygen)";
    } else if (oxygen < 90) {
        return "(Low Blood Oxygen)";
    } else if (oxygen < 95) {
        return "(Low Blood Oxygen Warning)";
    } else {
        return "(Normal Blood Oxygen)"
    }
}

// 정상 BMI인지
fat = (BMI) => {
    if (BMI < 18.5) {
        return "(Underweight)";
    } else if (BMI < 23) {
        return "(Normal weight)";
    } else if (BMI < 25) {
        return "(Overweight)";
    } else {
        return "Obesity";
    }
}

// 심전도 (아직 센서 없음)

// 근전도 (아직 센서 없음)