const express = require('express')
const config = require('config')
const pg = require('pg')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || config.get("server.port")
const uri = process.env.DATABASE_URL || config.get("db.uri");
const secret = process.env.JWT_SECRET || config.get("jwt.secret");

console.log("SECRET==>", secret);

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended:true}))

const listaPedidos = []
const pool = new pg.Pool ({
    connectionString: uri,
    ssl: {
        rejectUnauthorized: false
    }
})


const filtroJwt = (req, res, proximo) => { 
    console.log("Headers ==>", req.headers);
    if (req.headers.authorization 
        && req.headers.authorization.substring(0, 6) === "Bearer") { 
        const token = req.headers.authorization.substring(7);
        console.log("Token ==> ", token);
        jwt.verify(token, secret, (err, info) => { 
            if (err) { 
                res.status(403).send("Token inválido");
            } else { 
                proximo();
            }
        });
    } else { 
        res.status(403).send("É necessário um token para acessar este recurso")
    }
}

app.route('/reset').get((req, res) => { 
    let qry = "DROP TABLE IF EXISTS pedidos;"
    qry += "CREATE TABLE pedidos ("
    qry += "cliente char(100),"
    qry += "sabor char(50),"
    qry += "quantidade int,"
    qry += "tamanho char(25)"
    qry += ");"
    qry += "DROP TABLE IF EXISTS usuarios;"
    qry += "CREATE TABLE usuarios ("
    qry += "usuario varchar(50),"
    qry += "senha varchar(255),"
    qry += "perfil varchar(25),"
    qry += "nome varchar(100)"
    qry += ");"
    qry += "INSERT INTO usuarios (usuario, senha, perfil, nome) "
    qry += "VALUES ('user', '123', 'ADMIN', 'USUARIO DE TESTE');";
    pool.query(qry, (err, dbres) => {
        if (err) { 
            res.status(500).send(err)
        } else { 
            res.status(200).send("Banco de dados resetado")
        }
    })
})

app.route('/pedidos').get(filtroJwt, (req, res) => {
    console.log("/pedidos acionado")
    let qry = "SELECT * FROM pedidos;"
    pool.query(qry, (err, dbres) => { 
        if(err) { 
            res.status(500).send(err)
        } else { 
            res.status(200).json(dbres.rows)
        }
    });
})

app.route('/pedido/adicionar').post(filtroJwt, (req, res) => { 
    console.log("/pedido/adicionar acionado")
    let qry = "INSERT INTO pedidos (cliente, sabor, quantidade, tamanho) "
    qry += ` VALUES ('${req.body.cliente}', '${req.body.sabor}', ${req.body.quantidade}, '${req.body.tamanho}');`
    pool.query(qry, (err, dbres) => { 
        if (err) { 
            res.status(500).send(err)
        } else { 
            res.status(200).send("Pedido adicionado com sucesso")
        }
    });
})

app.route('/login').post((req, res) => { 
    console.log("Request ==> ", req.body);
    let qry = `SELECT * FROM usuarios WHERE usuario = $1 `;
    qry += ` AND senha = $2;`;
    console.log("Query==>", qry);
    pool.query(qry, [req.body.usuario, req.body.senha], (err, dbres) => {        
        if (err) { 
            res.status(500).send(err);
        } else { 
            console.log("Foram encontrados ", dbres.rowCount, " registros");
            console.log(dbres.rows);
            if (dbres.rowCount > 0) { 
                const row = dbres.rows[0];
                console.log("1ª Linha==>", row);
                const payload = {
                    usuario: row.usuario,
                    perfil: row.perfil,
                    nome: row.nome,
                }
                const token = jwt.sign(payload, secret);
                console.log("Token => ", token);
                const objToken = {token};
                res.status(200).json(objToken);
            } else { 
                res.status(401).send("Usuário ou senha inválidos");
            }
        }
    })
});

app.listen(port, () => { 
    console.log("Iniciando o servidor na porta ", port)
})

console.log("Inicio do projeto")