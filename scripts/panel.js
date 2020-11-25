




// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var upload = document.getElementById("upload");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
upload.onclick = function() {
  file_title.style.display = "none";
  modal.style.display = "block";
  file.setAttribute('data-before', "Choose the video you want to upload...");
  file.style.display = "block";
  file.style.color = "transparent";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

var form = document.getElementById("modal-form");
var file = document.getElementsByClassName("file")[0];
var file_title = document.getElementById("file_title");

const allowed_size_mb = 100;

file.onchange = function () {

    let input = this.files[0];

    if (input && input.length !== 0) {

        if(input.size > allowed_size_mb*1024*1024) {
			alert('Error : Exceeded size');
			return;
		}
        // file.style.color = "white";
        // file.setAttribute('data-before', 'Your file name: ');
        file.style.display="none";
        file_title.style.display="block";
        console.log(input)
        file_title.innerHTML= input.name;

    } else {
        alert("Please select a file.");
    }

};

let videos = document.getElementById("videos");

let vids, files = [];

const url='/files';

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


async function getVideos(){

 let response = await fetch(url);

        response.json().then((data)=>{

            let index = 1;

            for(video of data){

                let shareableLink = document.createElement("p");
                shareableLink.innerHTML = `https://vodbox.herokuapp.com/v?watch=${video.filename}`;

                let thumbnail = document.createElement("div");
                thumbnail.setAttribute('id',"thumbnail");

                let icon = document.createElement("ion-icon");
                icon.setAttribute('name',"image");
                icon.style.zIndex = "100";
                   
                if(video.metadata.public){
                    let lock_open = document.createElement("ion-icon");
                    lock_open.setAttribute('name',"lock-open");
                    lock_open.style.zIndex = "100";
                    thumbnail.appendChild(lock_open);
                    thumbnail.style.background = "#27ae60";
                    thumbnail.addEventListener("click", ()=>{
                        prompt("Your video is publicly accessible from this link:", shareableLink.innerHTML);
                    })
                }else{
                    let lock_closed = document.createElement("ion-icon");
                    lock_closed.setAttribute('name',"lock-closed");
                    lock_closed.style.zIndex = "100";
                    thumbnail.appendChild(lock_closed);
                }

                let title = document.createElement("div");
                title.setAttribute('id',"video-title");
                let name = video.metadata.name;
                title.innerHTML = name;
            
                let bar = () =>{

                    let _bar = document.createElement("div");
                    _bar.setAttribute('class',"bar");
                    _bar.innerHTML = "|";

                    return _bar;

                }
               
                let field = document.createElement("div");
                field.setAttribute('id',"field");

                let file_type = document.createElement("div");
                file_type.setAttribute('id',"file-type");
                file_type.innerHTML = video.metadata.extension.substring(1);
                
                let storage = document.createElement("div");
                storage.setAttribute('id',"storage");
                storage.innerHTML = formatBytes(video.length);

                field.appendChild(file_type);
                field.appendChild(storage);
            
                // let length = document.createElement("div");
                // length.setAttribute('id',"length");
                // length.innerHTML = "Calculating...";
                

                let date = document.createElement("div");
                date.setAttribute('id',"date");
                date.innerHTML = new Date(video.uploadDate).toUTCString(); 
                
                let play = document.createElement("ion-icon");
                play.setAttribute('name',"play");
                play.setAttribute('id',"play");

                let source = document.createElement("source");
                source.setAttribute("type", video.contentType);
                source.setAttribute("src",`/video/${video.filename}`);

                let frame = document.createElement("video");
                frame.setAttribute("class","hiddenVideoPlayer");
                frame.width = "950";
                frame.height = "500";
                frame.controls = true;

                // frame.preload = 'metadata'

                // frame.onloadedmetadata = function () {

                //     let temp = new Date(0);
                //     temp.setSeconds(frame.duration);
                //     let time = temp.toISOString().substr(11, 8);

                //     length.innerHTML = time;
                // }      

                frame.appendChild(source);

                play.addEventListener("click",()=>{

                    if(frame.className === "videoPlayer"){

                        frame.className = "hiddenVideoPlayer";

                    }else{

                        frame.className = "videoPlayer";

                    }

                })

                let play_div = document.createElement("div");
                play_div.style.marginLeft="1rem";
                
                let close = document.createElement("ion-icon");
                close.setAttribute('name',"close");
                close.setAttribute('id',"close");

                let link = document.createElement("a");
                link.setAttribute('href', "#");
                link.setAttribute('onclick', `if (confirm('Are you sure you want to delete this video?')) {document.getElementById("del-${index}").submit(); }`);

                link.appendChild(close);

                let del = document.createElement("form");
                del.setAttribute('id',`del-${index}`);
                del.setAttribute('action', `/files/${video._id}?_method=DELETE`);
                del.setAttribute('method', "POST");  
                
                del.appendChild(link);

                let share = document.createElement("ion-icon");
                share.setAttribute('name',"share-social-outline");
                share.setAttribute('id',"share");

                let share_link = document.createElement("a");
                share_link.setAttribute('href', "#");
                share_link.setAttribute('onclick', `document.getElementById("share-${index}").submit();`);

                share_link.appendChild(share);

                let share_form = document.createElement("form");
                share_form.setAttribute('id',`share-${index}`);
                share_form.setAttribute('action', `/toggle/${video.filename}`);
                share_form.setAttribute('method', "GET");  
                
                share_form.appendChild(share_link);

                let ctrl = document.createElement("div");
                ctrl.setAttribute('name',"ctrl");
                ctrl.setAttribute('id',"ctrl");

                let vid = document.createElement("div");
                vid.setAttribute('id',"video");
                
                let block = document.createElement("div");
                block.setAttribute('id',"block");

                vid.appendChild(thumbnail);
                vid.appendChild(title);
                vid.appendChild(bar());
                vid.appendChild(field);
                vid.appendChild(bar());
                // vid.appendChild(length);
                // vid.appendChild(bar());
                vid.appendChild(date);
                play_div.appendChild(play);
                ctrl.appendChild(play_div);
                ctrl.appendChild(del);
                ctrl.appendChild(share_form);
                vid.appendChild(ctrl);


                block.appendChild(vid);
                block.appendChild(frame);
               
            
                videos.appendChild(block);

                index++;
            }

    }).catch(()=>{

        let text = document.createElement("h1");
        text.setAttribute('id','title');
        text.style.backgroundColor = "transparent";
        text.innerHTML = "You didn't upload any videos yet...";

        videos.appendChild(text);

    });

 }

getVideos();