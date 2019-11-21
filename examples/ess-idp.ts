import * as http from 'http'
import * as rp from 'request-promise';
import Koa from 'koa'
import Router from 'koa-router'
import nodemailer from 'nodemailer'
import { defaultConfiguration } from '../src'
import { keystore } from './keystore'
import path from 'path'

const PORT = 8080

console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS);

async function init () {
  // const testAccount = await nodemailer.createTestAccount()

  const idpRouter = await defaultConfiguration({
    issuer: 'http://localhost:8080',
    pathPrefix: '',
    keystore,
    mailConfiguration: (process.env.EMAIL_USER && process.env.EMAIL_PASS) ? {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    } : undefined,
    webIdFromUsername: async (username: string) => {
      return `http://localhost:8000/${username}/profile/card#me`
    },
    onNewUser: async (username: string) => {

      var webId = `http://localhost:8000/${username}/profile/card#me`;

      var options = {
        uri: "http://localhost:8000/register",
        method: "POST",
        form: {
          // Like <input type="text" name="name">
          username: username
        },
        headers: {
          /* 'content-type': 'application/x-www-form-urlencoded' */ // Is set automatically
        }
      }

      await rp.post(options)

      var trustedAppsRequestOptions = {
        uri: webId,
        method: "PATCH",
        body: "INSERT DATA { <" + webId + "> <http://www.w3.org/ns/auth/acl#trustedApp> _:bn_eznjqs .\n" +
            "_:bn_eznjqs <http://www.w3.org/ns/auth/acl#origin> <http://localhost:3000> .\n" +
            "_:bn_eznjqs <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .\n" +
            "_:bn_eznjqs <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Write> .\n" +
            "_:bn_eznjqs <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Append> .\n" +
            "_:bn_eznjqs <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .\n" +
            " }",
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      }

      await rp.patch(trustedAppsRequestOptions)

      return webId;
    },
    storagePreset: 'filesystem',
    storageData: {
      redisUrl: process.env.REDIS_URL || '',
      folder: path.join(__dirname, './.db')
    }
  })

  const app = new Koa()
  app.use(idpRouter.routes())
  app.use(idpRouter.allowedMethods())

  app.listen(PORT)
  console.log(`Listening on port ${PORT}`)
}
void init()
