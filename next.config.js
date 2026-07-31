const { setupHoneybadger } = require('@honeybadger-io/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {}
}

module.exports = setupHoneybadger(nextConfig)
