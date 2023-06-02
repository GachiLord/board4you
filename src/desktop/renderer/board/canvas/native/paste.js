export default async function retrieveImageFromClipboardAsBase64(pasteEvent, imageFormat = "image/png"){
    if(pasteEvent.clipboardData == false) return undefined

    var items = pasteEvent.clipboardData.items;

    if(items == undefined) return undefined

    for (var i = 0; i < items.length; i++){
        // Skip content if not image
        if (items[i].type.indexOf("image") == -1) continue;
        // Retrieve image on clipboard as blob
        var blob = items[i].getAsFile();

        return new Promise(resolve => {
            // Create an abstract canvas and get context
            var mycanvas = document.createElement("canvas");
            var ctx = mycanvas.getContext('2d');
            
            // Create an image
            var img = new Image();

            // Once the image loads, render the img on the canvas
            img.onload = function(){
                // Update dimensions of the canvas with the dimensions of the image
                mycanvas.width = this.width;
                mycanvas.height = this.height;

                // Draw the image
                ctx.drawImage(img, 0, 0);

                // Execute callback with the base64 URI of the image
                resolve({
                    url: mycanvas.toDataURL(
                        (imageFormat || "image/png")
                    ),
                    size: {height: mycanvas.height, width: mycanvas.width}
                });
            };

            // Crossbrowser support for URL
            var URLObj = window.URL || window.webkitURL;

            // Creates a DOMString containing a URL representing the object given in the parameter
            // namely the original Blob
            img.src = URLObj.createObjectURL(blob);
            img.remove()
        })
    }
}