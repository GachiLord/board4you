import IImage from "../image/IImage";

export default async function retrieveImageFromClipboardAsBase64(pasteEvent: ClipboardEvent, imageFormat = "image/png"): Promise<IImage>{
    if(!pasteEvent.clipboardData) return undefined

    const items = pasteEvent.clipboardData.items;

    if(items == undefined) return undefined

    for (let i = 0; i < items.length; i++){
        // Skip content if not image
        if (items[i].type.indexOf("image") == -1) continue;
        // Retrieve image on clipboard as blob
        const blob = items[i].getAsFile();

        return new Promise(resolve => {
            // Create an abstract canvas and get context
            const mycanvas = document.createElement("canvas");
            const ctx = mycanvas.getContext('2d');
            
            // Create an image
            const img = new Image();

            // Once the image loads, render the img on the canvas
            img.onload = function(){
                // Update dimensions of the canvas with the dimensions of the image
                mycanvas.width = img.width;
                mycanvas.height = img.height;

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
            const URLObj = window.URL || window.webkitURL;

            // Creates a DOMString containing a URL representing the object given in the parameter
            // namely the original Blob
            img.src = URLObj.createObjectURL(blob);
            img.remove()
        })
    }
}