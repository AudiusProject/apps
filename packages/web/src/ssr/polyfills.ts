/**
 * Browser polyfills for Node.js globals
 * This file MUST be imported before any other imports to ensure
 * Buffer, process, and global are available when modules load.
 */

import { Buffer } from 'buffer'

import processBrowser from 'process/browser'

// @ts-ignore
window.global ||= window
// @ts-ignore
window.Buffer = Buffer
window.process = { ...processBrowser, env: process.env }
