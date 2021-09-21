let completeBlob = null
let recorder = null
let chunks = [];
let stream = null
async function startRecord() {
    chunks = []
    try {

        stream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: {
                mediaSource: 'screen'
            },
        })
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.start();
        // recorder.onstop = onstop
        document.getElementById("startBtn").style.display = "none"
        document.getElementById("stopBtn").style.display = "unset";
    } catch (error) {
        window.alert(error)
    }
}

async function stopScreen() {
    recorder.stop();
    document.getElementById("stopBtn").style.display = "none";
    document.getElementById("saveBtn").style.display = "unset";
    stream.getTracks().forEach(function (track) {
        track.stop();
    });
}

// function onstop() {
//     completeBlob = new Blob(chunks, {
//         type: chunks[0].type
//     });
// }

function saveStream() {
    completeBlob = new Blob(chunks, {
        type: chunks[0].type
    });

    // URL.createObjectURL(completeBlob)

    let formData = new FormData();
    let file = new File([completeBlob], "record.mp4");
    formData.append('file', file);

    $.ajax({
        url: "/record",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
    }).done(function(data) {
        window.alert("저장되었습니다.");
    }).fail(function(xhr, status, errorThrown) {
        window.alert("내부 오류가 발생하였습니다.\n오류명: " + errorThrown +"\n상태: " + status);
    });

    document.getElementById("saveBtn").style.display = "none";
    document.getElementById("startBtn").style.display = "unset";
}