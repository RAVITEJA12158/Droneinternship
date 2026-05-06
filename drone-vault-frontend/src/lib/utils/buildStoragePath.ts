export function buildStoragePath(
  userId: string,
  projectId: string,
  missionId: string,
  fileName: string
): string {
  return `users/${userId}/projects/${projectId}/missions/${missionId}/${fileName}`
}

export function buildThumbnailPath(fileId: string): string {
  return `/api/files/${fileId}/thumbnail`
}
