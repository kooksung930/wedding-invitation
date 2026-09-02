const DRIVE_FOLDER_ID = '1jViWacJPtlnwcvEHc54v9gV7nCMgc1PV';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('결혼식 사진 남기기')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function savePhotos(formObject) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const name = String(formObject.name || '').trim();
  const message = String(formObject.message || '').trim();
  let blobs = formObject.photos;
  if (!Array.isArray(blobs)) blobs = [blobs];
  blobs = blobs.filter((blob) => blob && blob.getBytes && blob.getBytes().length > 0);
  if (!name) throw new Error('이름을 입력해주세요.');
  if (!blobs.length) throw new Error('사진을 선택해주세요.');
  if (blobs.length > 9) throw new Error('사진은 최대 9장까지 올릴 수 있어요.');

  const uploaded = blobs.map((blob) => {
    const bytes = blob.getBytes();
    const type = String(blob.getContentType() || '');
    if (bytes.length > MAX_FILE_SIZE) throw new Error(`${blob.getName()}은(는) 50MB를 초과했어요.`);
    if (!type.startsWith('image/')) throw new Error(`${blob.getName()}은(는) 이미지 파일이 아니에요.`);
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
    const file = folder.createFile(blob).setName(`${stamp}_${name}_${blob.getName()}`);
    file.setDescription(`촬영자: ${name}\n한마디: ${message}`);
    return file.getName();
  });
  return { count: uploaded.length, names: uploaded };
}
