import path from 'path'
import { mkdir } from 'fs/promises'

const isVercel = !!process.env.VERCEL

function getBaseDir() {
  return isVercel ? '/tmp' : process.cwd()
}

export function getConfigDir() {
  return path.join(getBaseDir(), 'config')
}

export function getOutputDir(dateStr) {
  return path.join(getBaseDir(), 'output', dateStr)
}

export async function ensureConfigDir() {
  const dir = getConfigDir()
  await mkdir(dir, { recursive: true })
  return dir
}

export async function ensureOutputDir(dateStr) {
  const dir = getOutputDir(dateStr)
  await mkdir(dir, { recursive: true })
  return dir
}

export function getProfilePath() {
  return path.join(getConfigDir(), 'profile.json')
}
