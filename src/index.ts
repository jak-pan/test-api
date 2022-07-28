import { ApiPromise, WsProvider } from "@polkadot/api"
import fs from "fs"
import {
  MetadataLatest,
  PalletStorageMetadataLatest,
  StorageEntryTypeLatest,
} from "@polkadot/types/interfaces/metadata"

import { TypeDefInfo } from "@polkadot/types"

// Unwrap single type (low level)
const unwrapStorageType = (
  type: StorageEntryTypeLatest,
  metadata: MetadataLatest,
) => {
  if (type.isPlain) {
    return { plain: metadata.lookup.types[type.asPlain.unwrap().toNumber()] }
  } else return type
  // Continue with others or just link to id???
}

// Unwrap storage type
const unwrapStorage = (
  storage: PalletStorageMetadataLatest,
  metadata: MetadataLatest,
) => {
  return storage.items.map((storageItem) => {
    const type = unwrapStorageType(storageItem.type, metadata)
    return { ...storageItem, type }
  })
}

const unwrapInfo = (info: number) => TypeDefInfo[info] || ""

const getTypeCategory = () => {}

const main = async () => {
  const wsProvider = new WsProvider("wss://rpc-01.basilisk.hydradx.io")
  const api = await ApiPromise.create({
    provider: wsProvider,
  })

  /* 
    Metadata object contains a lookup table of all the other types with their definitions and formats.
    All the root types are stored in the base object under index. 
    This means we'll look into a flat structure which can self reference subtypes easily. 
    We can construct a map of documentation by parsing the low level types and linking the docs of higher level docs. 
    By calling metadata.pallets we get topmost structures and can continue top to bootm. 
  */
  const metadata = api.runtimeMetadata.asLatest

  //const metadataFormatted = metadata.lookup.getTypeDef(0) //unwrapStorage(
  //   metadata.pallets[0].storage.unwrap(),
  //   metadata,
  // )

  const metaObject = JSON.stringify(metadata.toHuman())
  //const docs = JSON.stringify(metadataFormatted)

  if (fs.existsSync("./dist")) {
    fs.rmdirSync("./dist", { recursive: true })
  }
  fs.mkdirSync("./dist")

  const metadataIndexPage: string[] = []

  metadata.lookup.types.forEach((type, index) => {
    const typeDef = metadata.lookup.getTypeDef(index)
    const siType = metadata.lookup.getSiType(index)
    const name = metadata.lookup.getName(index) || typeDef.type

    metadataIndexPage.push(
      `<a style="display:block" href="${index}.html">${index}:${name}</a>`,
    )

    fs.writeFileSync(
      `./dist/${index}.html`,
      `<html>
        <head>
        <script src="https://cdn.jsdelivr.net/npm/w-jsonview-tree@1.0.27/dist/w-jsonview-tree.umd.js"></script>
        </head>
        <body style="font-size:10pt; font-family:Microsoft JhengHei,Helvetica;">
        <h1>${unwrapInfo(typeDef.info)} ${name} ${siType.def.type}</h1>
        <hr>
        <a href="index.html">< INDEX</a>
        <h2>Type info</h2>
        <div>Type:${typeDef.type}</div>
        <div>Namespace:${typeDef.namespace}</div>
        <a style="display:block" href="https://rustdocs.bsx.fi/basilisk/?search=${
          typeDef.namespace || typeDef.type
        }&go_to_first=true" target="_blank">Runtime documentation</a></div>
        <div id="typeDef"></div>
        <hr>
        <div id="fullType"></div>
        <hr>
        <div id="siType"></div>

        </body>
        
        <script>
          const fullType = ${JSON.stringify(type.toHuman())};
          const typeDef = ${JSON.stringify(typeDef)};
          const siType = ${JSON.stringify(siType)};
          const name = ${JSON.stringify(name)};
          const jview = window['w-jsonview-tree']
          jview(fullType, document.querySelector("#fullType"), {expanded:true})
          jview(typeDef, document.querySelector("#typeDef"), {expanded:true})
          jview(siType, document.querySelector("#siType"), {expanded:true})
        </script>
      </html>`,
    )
  })

  fs.writeFileSync(
    "./dist/index.html",
    `<html>
      <head>
      <script src="https://cdn.jsdelivr.net/npm/w-jsonview-tree@1.0.27/dist/w-jsonview-tree.umd.js"></script>
      </head>
      <body style="font-size:10pt; font-family:Microsoft JhengHei,Helvetica;">
      <div id="list">${metadataIndexPage.join("")}</div>
      <div id="tree"></div>
      </body>
      
      <script>
        const data = ${metaObject};
        const jview = window['w-jsonview-tree']
        jview(data, document.querySelector("#tree"), {expanded:false})
      </script>
    </html>`,
  )

  process.exit()
}

main()
