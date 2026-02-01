/**
 * Apps Script snippet: action=uploadImage
 *
 * Add this handler into your deployed Web App:
 *
 * function doPost(e) {
 *   const body = JSON.parse((e.postData && e.postData.contents) || "{}");
 *   const action = String(body.action || (e.parameter && e.parameter.action) || "").trim();
 *   if (action === "uploadImage") return uploadImageAction_(body);
 *   // ...existing actions (add/update/delete)
 * }
 */

function uploadImageAction_(body) {
  var token = (body && body.token) ? String(body.token) : "";
  var expectedToken = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_UPLOAD_TOKEN") || "";
  if (expectedToken && token !== expectedToken) {
    return json_(403, { ok: false, error: "Forbidden" });
  }

  var folderId = body && body.folderId ? String(body.folderId) : "";
  var data = body && body.data ? String(body.data) : "";
  var mimeType = body && body.mimeType ? String(body.mimeType) : "image/jpeg";
  var fileName = body && body.fileName ? String(body.fileName) : ("vehicle-" + new Date().getTime() + ".jpg");

  if (!folderId) return json_(400, { ok: false, error: "Missing folderId" });
  if (!data) return json_(400, { ok: false, error: "Missing data" });

  try {
    var folder = DriveApp.getFolderById(folderId);
    var bytes = Utilities.base64Decode(data);
    var blob = Utilities.newBlob(bytes, mimeType, fileName);
    var file = folder.createFile(blob);

    // Public (so <img src="..."> works)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var thumbnailUrl = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1000-h1000";

    return json_(200, {
      ok: true,
      data: {
        fileId: fileId,
        thumbnailUrl: thumbnailUrl,
      },
    });
  } catch (err) {
    return json_(500, { ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json_(status, obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
