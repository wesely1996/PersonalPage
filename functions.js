var bgmusic = document.getElementById("bgmusic");
bgmusic.volume = 0.2;

function playMusic() {
    let mb = document.getElementById("musicImg");
    if(mb.alt == "🔊"){
        mb.src = "./images/sound_off.png";
        mb.alt = "🔈";
        bgmusic.pause();
    }else{
        mb.src = "./images/sound_on.png";
        mb.alt = "🔊";
        bgmusic.play();
    }
}