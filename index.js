import { mkdirSync, writeFileSync } from 'fs'
import { join, basename } from 'path'
import { request } from 'axios'
import StoryblokClient from 'storyblok-js-client'

const config = {
  // your space id without the #
  space: 'YOUR_SPACE_ID',
  // https://www.storyblok.com/docs/management-api/authentication#authentication
  oauthToken: 'YOUR_OAUTH_TOKEN'
}

const storyblok = new StoryblokClient({
  oauthToken: config.oauthToken
})

let assetFolders = {}
let assets = []

const generateFolders = async () => {
  let folderResponse = await storyblok.get(`spaces/${config.space}/asset_folders`)

  folderResponse.data.asset_folders.forEach(folder => {
    assetFolders[folder.id] = join(__dirname, 'download', folder.name)
    mkdirSync(assetFolders[folder.id], { recursive: true })
  })

  getAssets()
}

const getAssets = async () => {
  const per_page = 10 // max 10 
  let response = await storyblok.get(`spaces/${config.space}/assets`, { per_page, page: 1 })
  const maxPage = Math.ceil(response.headers.total / per_page)

  assets = assets.concat(response.data.assets)

  for (let index = 2; index <= maxPage; index++) {
    let res = await storyblok.get(`spaces/${config.space}/assets`, { per_page, page: index })
    assets = assets.concat(res.data.assets)
  }

  downloadAssets()
}

const downloadAssets = async () => {
  for (let index = 0; index < assets.length; index++) {
    const file = assets[index];
    let response = await request({
      responseType: 'arraybuffer',
      url: file.filename,
      method: 'get'
    })

    let filename = basename(file.filename)
    let outputPath = join(__dirname, 'download', filename)

    if (file.asset_folder_id != null) {
      outputPath = join(assetFolders[file.asset_folder_id], filename)
    }

    writeFileSync(outputPath, response.data);
    console.log('Downloaded: ', outputPath)
  }
}

generateFolders()