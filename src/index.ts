import { ApiPromise, WsProvider } from "@polkadot/api"
import { prettyPrintJson } from "pretty-print-json"
import fs from "fs"
import {
  MetadataLatest,
  PalletStorageMetadataLatest,
  StorageEntryTypeLatest,
} from "@polkadot/types/interfaces/metadata"

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

  const metadataFormatted = unwrapStorage(
    metadata.pallets[0].storage.unwrap(),
    metadata,
  )

  const html = prettyPrintJson.toHtml(metadataFormatted)

  fs.writeFileSync(
    "./dist/index.html",
    `<html><link rel=stylesheet href=https://cdn.jsdelivr.net/npm/pretty-print-json@1.2/dist/pretty-print-json.css><body><pre id=account class=json-container>${html}</pre></body></html>`,
  )

  process.exit()
}

main()
