const express = require('express')
const app = express()
const async = require("async")
const db = require('@cyclic.sh/dynamodb')
const axios = require('axios')
const {
    param
} = require('express/lib/request')
const {
    get
} = require('express/lib/response')
const now = new Date()
'use strict'

app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})

app.post('/short/', async (req, res) => {
    console.log(Message("inProgress", "POST", ""))

    const col = "short"
    const shortedPath = req.body.shortedPath
    const sourcePath = req.body.sourcePath
    const author = req.body.author
    let info

    if (!shortedPath) {
        res.sendStatus(404)
        info = res.json(ErrorMessage("emptyShortedPath")).end()
        console.log(info)
    }
    if (!sourcePath) {
        res.sendStatus(404)
        info = res.json(ErrorMessage("emptySourcePath")).end()
        console.log(info)
    }

    //check duplicate
    // const duplicate = await Get(col, shortedPath)
    // if (duplicate == false) {
    //     const info = {
    //         "Info: ": ErrorMessage("failedPost")
    //     }
    //     res.json(info).end()
    //     console.log(info)
    // }

    //check the url notfound
    const checkUrl = await CheckURL(sourcePath)
    console.log(checkUrl)
    if (checkUrl) {
        res.json(checkUrl).end()
    }

    // const body = {
    //     "sourcePath": sourcePath,
    //     "shortedPath": shortedPath,
    //     "author": req.body.author ? author : null,
    //     "createdAt": now.toISOString(),
    //     "updatedAt": now.toISOString()
    // }

    // const post = await Post(col, shortedPath, body)

    // if (post == true) {
    //     const info = {
    //         "Info: ": SuccessMessage("successPost", shortedPath)
    //     }
    //     res.json(post).end()
    //     console.log(info)
    // } else {
    //     const info = {
    //         "Info: ": ErrorMessage("failedPost")
    //     }
    //     res.sendStatus(404)
    //     res.json(info).end()
    //     console.log(`${info} /shorted/${JSON.stringify(shortedPath)} `)
    // }
})

app.delete('/short/:shortedPath', async (req, res) => {
    const key = req.params.shortedPath
    console.log(Message("inProgress", "DELETE", key))
    const del = Delete("shorted", key)
    if (del == true) {
        const info = {
            "Info: ": SuccessMessage("successDelete", key)
        }
        res.json(info).end()
        console.log(info)
    } else {
        const info = {
            "Info: ": ErrorMessage("failedDelete")
        }
        res.sendStatus(404)
        res.json(info).end()
        console.log(`${info} /shorted/${JSON.stringify(key)} `)
    }
})

app.get('/short/:key', async (req, res) => {
    const col = "short"
    const key = req.params.shortedPath
    console.log(Message("inProgress", "GET", req.params.shortedPath))

    const get = Get(col, key)

    if (get == true) {
        const info = {
            "Info: ": SuccessMessage("successGet", key)
        }
        res.json(get).end()
        console.log(info)
    } else {
        const info = {
            "Info: ": ErrorMessage("failedGet")
        }
        res.sendStatus(404)
        res.json(info).end()
        console.log(`${info} /shorted/${JSON.stringify(key)} `)
    }
})

// //get All
// app.get('/getall/:col', async (req, res) => {
//     const col = req.params.col
//     console.log(`list collection: ${col} with params: ${JSON.stringify(req.params)}`)
//     const items = await db.collection(col).list()
//     let result = items.results.map(a => a.key)
//     let currentArray = []

//     await Promise.all(
//         result.map(async (item) => {
//             currentArray.push(await db.collection(col).get(item))
//         })
//     )

//     currentArray.map(item => {
//         Object.assign(item, item.props)
//         delete item.props
//         return item
//     })

//     let finalResult = {
//         "results": currentArray
//     }
//     res.json(finalResult).end()
// })

// Catch all handler for all other request.
app.use('*', (req, res) => {
    res.json({
        msg: 'no route handler found'
    }).end()
})

// Start the servers
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`index.js listening on ${port}`)
})

function ErrorMessage(err) {
    if (err == "emptyShortedPath") return "Shorted Path Cannot be Empty"
    if (err == "emptySourcePath") return "Source Path Cannot be Empty"
    if (err == "failedDelete") return "Failed to Delete, Data not Found"
    if (err == "failedPost") return "Failed to Post, Duplicate Data"
    if (err == "failedGet") return "Failed to Get, Data not Found"
    if (err == "failedUrl") return "URL Error"
}

function Message(msg, progress, params) {
    if (msg == "inProgress") return `try to ${progress} ${params}`
}

function SuccessMessage(msg, params) {
    if (msg == "successDelete") return `Success Delete ${JSON.stringify(params)}`
    if (msg == "successPost") return `Success Post ${JSON.stringify(params)}`
    if (msg == "successGet") return `Success Get ${JSON.stringify(params)}`
}

async function Delete(col, key) {
    try {
        return await db.collection(col).delete(key)
    } catch (e) {
        return e.message
    }
}

async function Post(col, key, body) {
    try {
        return await db.collection(col).set(key, body)
    } catch (e) {
        return e.message
    }
}

async function Get(col, key) {
    try {
        const item = await db.collection(col).get(key)
        let props = item.props
        delete props.updated
        delete props.created
        let newitem = {
            key: key,
            collection: col,
            ...props
        }
        return newitem
    } catch (e) {
        return e.message
    }
}

async function CheckURL(path) {
    return axios({
        method: 'get',
        url: path,
    }).catch((error) => {
        console.log(error)
        return ErrorMessage("failedUrl")
    })
}