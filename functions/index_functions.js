document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('mainmenu').classList.remove("hide");
    document.getElementById('loading').classList.add("hide");
 }, false);

var bgmusic = document.getElementById("bgmusic");
bgmusic.volume = 0.2;

function playMusic() {
    let mb = document.getElementById("musicImg");
    if(mb.alt == "🔊"){
        mb.src = "./images/sound_off.png";
        mb.alt = "🔈";
        bgmusic.pause();
    }else{
        mb.src = "./images/sound_on.PNG";
        mb.alt = "🔊";
        bgmusic.play();
    }
}

function showContacts(){
    let contacts = document.getElementById("contactBubble");
    contacts.innerHTML = 
    `<button id="contactsCloseButton" class="b--none bg-transparent"
    onclick="closeContacts()">
    X
    </button>
    <div class="d-flex justify-content-center">
        <div id="contactInfo" class="flex-column">
            <div>Telphone:</div>
            <div>+381 11 7513435</div>
            <div>Mobile:</div>
            <div>+381 64 6600821</div>
            <div>Email:</div>
            <div>veselinovicsn@gmail.com</div>
        </div>
    </div>`;
    contacts.classList.remove('hide');
    contacts.classList.add("contactsBubbleSize");
}

function closeContacts(){
    let contacts = document.getElementById("contactBubble");
    contacts.innerHTML = "";
    contacts.classList.add('hide');
    contacts.classList.remove("contactsBubbleSize");
}