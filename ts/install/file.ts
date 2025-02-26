import { join } from 'path'
import { downloadBinary, downloadToFile } from '../download'
import { getInstallDir } from '../env'
import {
  displayOutput,
  endsWithExe,
  getBinName,
  getFilename,
  guessName,
  installOutputFiles,
  nameNoExt,
  showSuccess,
} from '../tool'
import { DistManifest, Output } from '../type'
import { chmodSync, readFileSync } from 'fs'
import { getLocalTarget, guessTarget, Os, targetGetOs } from 'guess-target'

export type FileInstall = {
  url: string
  name?: string
}

export async function fileInstall(
  info: FileInstall,
  downloadUrl: string,
  dist?: DistManifest,
  dir?: string,
): Promise<Output> {
  let installDir: string = getInstallDir()
  if (dir) {
    if (dir.includes('/') || dir.includes('\\')) {
      installDir = dir
    } else {
      installDir = join(installDir, dir).replaceAll('\\', '/')
    }
  }

  const { url, name } = info
  const filename = name ?? getFilename(downloadUrl)

  const localTarget = getLocalTarget()
  if (
    endsWithExe(downloadUrl) &&
    localTarget.some((i) => targetGetOs(i) !== Os.Windows)
  ) return {}
  const binName = guessName(nameNoExt(filename))?.name ??
    nameNoExt(filename)

  const mode = 0o755
  const originPath = downloadUrl.split('/').at(-1)!
  const isDir = false
  if (!dist) {
    const installPath = join(installDir, getBinName(binName)).replaceAll(
      '\\',
      '/',
    )

    console.log(`download ${downloadUrl}`)
    await downloadToFile(downloadUrl, installPath)
    chmodSync(installPath, mode)
    const buffer = readFileSync(installPath)
    const files = [{
      mode,
      size: buffer.length,
      isDir,
      originPath,
      downloadUrl,
      installPath,
      installDir,
      buffer,
    }]
    const output: Output = {
      [downloadUrl]: {
        installDir,
        files,
      },
    }
    showSuccess()
    console.log(displayOutput(output))
    return output
  }
  const artifact = dist?.['artifacts'][url]
  if (artifact) {
    const buffer = new Uint8Array(await downloadBinary(downloadUrl))
    const installPath = join(installDir, getBinName(binName)).replaceAll(
      '\\',
      '/',
    )
    const size = buffer.byteLength
    const files = [{
      size,
      mode,
      downloadUrl,
      installPath,
      installDir,
      originPath,
      isDir,
      buffer,
    }]
    const output: Output = {
      [downloadUrl]: {
        installDir,
        files,
      },
    }
    installOutputFiles(files)
    showSuccess()
    console.log(displayOutput(output))
    return output
  } else {
    console.log(`not found/download artifact for ${url}`)
  }
  return {}
}
