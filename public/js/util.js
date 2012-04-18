function addAnchor (mime, data, name) {
	var anchor = document.createElement("a");
	anchor.href = "data:"+mime+";"+"base64,"+data;
	anchor.setAttribute("download", "encoded");
	anchor.textContent = "Download";
	document.body.appendChild(anchor);
}