// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default function handler(req, res) {
  const { que } = req.query
  const { exec } = require("child_process")
  exec(
    `grep -ir --line-number --binary-files=without-match '${que}' './post'`,
    (err, stdout, stderr) => {
      if (err) {
        res.status(404).json({ name: "null" })
      } else {
        res.status(200).json({ name: stdout })
      }
    }
  )

  //   res.status(200).json({ name: que })
}
