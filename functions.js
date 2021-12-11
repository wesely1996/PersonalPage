function playMusic() {
    let mb = document.getElementById("ngmusicButton");
    if(mb.innerHTML == "🔈"){
        mb.innerHTML = "🔊";
        document.getElementById("bgmusic").play();
    }else{
        mb.innerHTML = "🔈";
        document.getElementById("bgmusic").pause();
    }
}