var matches = [];
var curMatch = 0;

$('#fileToUpload').change(function() {
    ProcessImage();
});

$('#curMatch').change(function() {
    curMatch = parseInt($('#curMatch').val()) - 1;
    dispMatch();
});

function DetectFaces() {
    AWS.region = "eu-west-1";
    var rekognition = new AWS.Rekognition();
    var params = {
        Image: {
            Bytes: imageBytes
        }
    };
    $('#img1-cont div.box').remove();
    $('#quality').hide();
    $('#img2').attr('src', '');
    $('#box2').hide();
    $('#similarity').hide();
    $('#totalMatches').text(0);
    $('#curMatch').val(0);
    $('#description').hide();
    $('.pager').hide();
    $('.jumbotron').show();

    $('#message').text('Detecting faces…');
    $('#loader').show();
    rekognition.detectFaces(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            var imgE = $('#img1');

            for (var i=0; i < data.FaceDetails.length; i++) {
                var details = data.FaceDetails[i];
                var box = details.BoundingBox;
                var top = imgE.height()*box.Top,
                    left = imgE.width()*box.Left,
                    width = imgE.width()*box.Width,
                    height = imgE.height()*box.Height;

                var boxE = $('<div>').addClass('box');
                // 15px padding
                boxE.css({top: top+15, left: left+15, width: width, height: height});
                $('#img1-cont').append(boxE);
                boxE.show();

                !function callSearchFace(reko, img, boxE, box) {
                    boxE.click(function() {
                        searchFace(reko, img, boxE, box);
                    });
                }(rekognition, imgE, boxE, box);

                if (i == 0) {
                    // search for first face automatically
                    searchFace(rekognition, imgE, boxE, box);
                }
            }

            $('#brightness').text(Number.parseFloat(details.Quality.Brightness).toPrecision(4)+'%');
            colorInfo('#brightness', details.Quality.Brightness, 90, 70);
            $('#sharpness').text(Number.parseFloat(details.Quality.Sharpness).toPrecision(4)+'%');
            colorInfo('#sharpness', details.Quality.Sharpness, 90, 70);
            $('#quality').show();

            $('#message').text('Select a face in the picture to search for matches');
            $('#loader').hide();
        }
    });
}

function searchFace(rekognition, imgE, e, box) {
    $('#img1-cont div.box').removeClass('selected');
    $(e).addClass('selected');

    $('.jumbotron').show();

    // TODO: refactor this
    $('#img2').attr('src', '');
    $('#box2').hide();
    $('#similarity').hide();
    $('#totalMatches').text(0);
    $('#curMatch').val(0);
    $('#description').hide();
    $('.pager').hide();

    $('#message').text('Searching for matching faces…');
    $('#loader').show();

    var canvas = $('#crop')[0];
    var ctx = canvas.getContext('2d');
    imgE.ready(function(){
        var top = imgE.get(0).naturalHeight*box.Top,
            left = imgE.get(0).naturalWidth*box.Left,
            width = imgE.get(0).naturalWidth*box.Width,
            height = imgE.get(0).naturalHeight*box.Height;
        ctx.canvas.width = width;
        ctx.canvas.height = height;
        ctx.drawImage(imgE[0], left, top, width, height, 0, 0, width, height);

        var b64 = canvas.toDataURL();
        var bytes = base64ImgToBytes(b64);

        var collection = 'flickr'
        var params = {
            CollectionId: collection,
            FaceMatchThreshold: 80,
            Image: {
                Bytes: bytes,
            }
        };
        rekognition.searchFacesByImage(params, function (err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                matches = data.FaceMatches;
                if (matches.length == 0) {
                    $('#message').text("No matches found");
                    $('#loader').hide();
                } else {
                    $('.jumbotron').hide();
                    curMatch = 0;
                    dispMatch();
                }
            }
        });
    });
}


function colorInfo(elem, val, green, orange) {
    if (val > green) {
        $(elem).css({color: 'green'});
    } else if (val > orange) {
        $(elem).css({color: 'orange'});
    } else {
        $(elem).css({color: 'red'});
    }
}

function prevMatch() {
    curMatch -= 1;
    dispMatch();
}

function nextMatch() {
    curMatch += 1;
    dispMatch();
}

function setDescription(url, title, description, provider) {
    $('#description a').attr('href', url);
    $('#description a h3').html('<i class="fab fa-lg fa-"'+provider+'"></i> '+title);
    $('#description p').html(description);
    $('#description').show();
}

function dispMatch() {
    $('#totalMatches').text(matches.length);
    $('#curMatch').val(curMatch+1);

    if (curMatch == 0) {
        $('#prev').hide();
    } else {
        $('#prev').show();
    }

    if (curMatch == matches.length-1 || matches.length == 0) {
        $('#next').hide();
    } else {
        $('#next').show();
    }

    var match = matches[curMatch];
    var img = match.Face.ExternalImageId;
    var bits = img.split(':');
    var imgE = $('#img2');


    if (bits[0] === 'flickr') {
        imgE.attr('src', "http://farm"+bits[1]+".staticflickr.com/"+bits[2]+"/"+bits[3]+"_"+bits[4]+"_b.jpg");
        var url = "https://flic.kr/p/"+base58.encode(parseInt(bits[3]));

        // Flickr title and description
        var flickrApiKey = '686e331b830f5e61da5fc08906a328fa';
        var flickr = new Flickr(flickrApiKey);
        flickr.photos.getInfo(bits[3], function(response) {
            var title = response.photo.title._content;
            var description = response.photo.description._content;
            setDescription(url, title, description, 'flickr');
        });
    } else if(bits[0] === 'reddit') {
      console.log('Getting reddit pic '+img);
      imgE.attr('src', 'https://i.redd.it/'+bits[3]);
      var url = 'https://www.reddit.com/r/'+bits[1]+'/comments/'+bits[2];

      $.getJSON(url+'.json', function(data) {
          var title = data[0].data.children[0].data.title;
          var description = '';
          setDescription(url, title, description, 'reddit');
      });
    } else {
      console.log('Unknown provider '+bits[0]);
    }

    $('#img2-link').attr('href', url);
    $('#simil').text(Number.parseFloat(match.Similarity).toPrecision(4)+'%');
    colorInfo('#simil', match.Similarity, 99, 90);
    $('#similarity').show();

    var box = match.Face.BoundingBox;
    imgE.on('load', function() {
        // 15px padding
        $('#box2').css({top: imgE.height()*box.Top+15, left: imgE.width()*box.Left+15, width: imgE.width()*box.Width, height: imgE.height()*box.Height});
        $('#box2').show();
        $('.pager').show();
    });
}

var imageBytes;

function base64ImgToBytes(b64) {
    var jpg = true;
    try {
        image = atob(b64.split("data:image/jpeg;base64,")[1]);

    } catch (e) {
        jpg = false;
    }
    if (jpg == false) {
        try {
            image = atob(b64.split("data:image/png;base64,")[1]);
        } catch (e) {
            alert("Not an image file Rekognition can process");
            return;
        }
    }
    //unencode image bytes for Rekognition DetectFaces API
    var length = image.length;
    var bytes = new ArrayBuffer(length);
    var ua = new Uint8Array(bytes);
    for (var i = 0; i < length; i++) {
        ua[i] = image.charCodeAt(i);
    }

    return bytes;
}

//Loads selected image and unencodes image bytes for Rekognition DetectFaces API
function ProcessImage() {
    AnonLog();
    var control = document.getElementById("fileToUpload");
    var file = control.files[0];
    if(file.size > 5242880){
        alert("File is too big (5MB max)!");
        return;
    };

    // Load base64 encoded image
    var reader = new FileReader();
    reader.onload = (function (theFile) {
        return function (e) {
            //var img = document.createElement('img');
            var img = document.getElementById("img1");
            var image = null;
            img.src = e.target.result;

            imageBytes = base64ImgToBytes(e.target.result);

            //Call Rekognition
            DetectFaces();
        };
    })(file);
    reader.readAsDataURL(file);
}
//Provides anonymous log on to AWS services
function AnonLog() {

    // Configure the credentials provider to use your identity pool
    AWS.config.region = 'eu-west-1'; // Region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'eu-west-1:99b93f57-2e55-43c2-a577-71a64c5031a4',
    });
    // Make the call to obtain credentials
    AWS.config.credentials.get(function () {
        // Credentials will be available when this function is called.
        var accessKeyId = AWS.config.credentials.accessKeyId;
        var secretAccessKey = AWS.config.credentials.secretAccessKey;
        var sessionToken = AWS.config.credentials.sessionToken;
    });
}
