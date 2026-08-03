/* eslint-disable @typescript-eslint/no-require-imports */
const { setupHoneybadger } = require('@honeybadger-io/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  async redirects() {
    return [
      {
        source: "/programs",
        has: [{ type: "query", key: "level", value: "associate" }],
        destination: "/programs/associate",
        permanent: true,
      },
      {
        source: "/programs",
        has: [{ type: "query", key: "level", value: "bachelor" }],
        destination: "/programs/bachelors",
        permanent: true,
      },
      {
        source: "/programs",
        has: [{ type: "query", key: "level", value: "graduate" }],
        destination: "/programs/graduate",
        permanent: true,
      },
      {
        source: "/programs",
        has: [{ type: "query", key: "level", value: "certificate" }],
        destination: "/programs/certificates",
        permanent: true,
      },
      {
        source: "/programs/bachelor",
        destination: "/programs/bachelors",
        permanent: true,
      },
      {
        source: "/programs/certificate",
        destination: "/programs/certificates",
        permanent: true,
      },
    ]
  },
}

module.exports = setupHoneybadger(nextConfig)
