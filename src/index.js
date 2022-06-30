const express = require("express");
const app = express();
//importando biblioteca uuid e renomeando para uuidv4
const { v4: uuidv4 } = require("uuid");
//importanto middleware de uso do JSON
app.use(express.json());

const port = 3000


//criando um array para armazenar nossas informações em tempo de execução
const clientes = [];

//middleware de verificação de contas.
function verificaContaExistenteCPF (request, response, next) {
    const { cpf } = request.headers;
    const cliente = clientes.find((cliente) => cliente.cpf == cpf);
    if(!cliente){
        return response.status(400).json({error: "cliente not found!"});
    }

    request.cliente = cliente;
    return next();
}

//calculando o balanço da conta.
function getSaldo(extrato){
    const saldo = extrato.reduce((acc, operation) => {
        if(operation.type === 'credit') {
            return acc + operation.quantidade;      
        }else {
            return acc - operation.quantidade;
        }
    }, 0)
}

/*
 * DADOS DA CONTA
 * cpf - string
 * nome - string
 * id - uuid
 * extrato - [] extrato
 */

//como sabemos o post é o método para criar, usaremos /conta como o recurso
app.post("/conta", (request, response) => {
    const { cpf, name } = request.body; //pegando cpf e nome utilizando conceito de desestruturação
    
    //Não deve ser possível cadastrar uma conta de CPF já existente.
    const clienteJaExiste = clientes.some(
        (cliente) => cliente.cpf === cpf
    );
    //regra caso o cpf já esteja cadastrado
    if (clienteJaExiste){
        return response.status(400).json({error: "cliente Já existe!"});
    }    
        
    clientes.push({
        cpf,
        name,
        id: uuidv4(),
        extrato: []
    });
    
    return response.status(201).send();
});


//usamos o método get para buscar, usaremos /extrato como recurso
app.get("/extrato/", verificaContaExistenteCPF, (request, response) => {
    const { cliente } = request
    return response.json(cliente.extrato);
});

//fazendo depósito na conta
app.post("/deposito", verificaContaExistenteCPF, (request, response) => {
    const { description, quantidade } = request.body;
    const { cliente } = request;

    const extratoOperation = {
        description,
        quantidade,
        created_at: new Date(),
        type: "credit"
    };

    cliente.extrato.push(extratoOperation);
    return response.status(201).send();
});


//realizando saque na conta
app.post("/retirar", verificaContaExistenteCPF, (request, response) => {
    const { quantidade } = request.body;
    const { cliente } = request;

    const saldo = getSaldo(cliente.extrato);

    if(saldo < quantidade) {
        return response.status(400).json({error: "Saldo Insuficiente!"})
    };

    const extratoOperation = {
        quantidade,
        created_at: new Date(),
        type: "debit"
    }

    cliente.extrato.push(extratoOperation);
    return response.status(201).send();

})



//buscar extrato por data
app.get("/extrato/date", verificaContaExistenteCPF, (request, response) => {
    const { cliente } = request;
    const { date } = request.query;
    //formatando a data e informando ao filtro que o horário não é relevante.
    const dateFormat = new Date(date + " 00:00");

    //filtro para retornar o extrato somente da data informada.
    const extrato = cliente.extrato.filter((extrato) =>
    extrato.created_at.toDateString() ===
    new Date (dateFormat).toDateString()
    );

    //caso existe alguma movimentação neste dia, retorne o extrato
    return response.json(extrato)

});

//atualizar dados do cliente
app.put("/conta", verificaContaExistenteCPF, (request, response) => {
    const { name } = request.body;
    const { cliente } = request;

    cliente.name = name;
    return response.status(201).send();
});

//obter dados da conta
app.get("/conta", verificaContaExistenteCPF, (request, response) => {
    const { cliente } = request;
    return response.json(cliente);
});

//deletar conta
app.delete("/conta", verificaContaExistenteCPF, (request, response) => {
    const { cliente } = request;    
    clientes.splice(cliente, 1);
    return response.status(200).json(clientes);
});

//retornando o balanço da conta
app.get("/saldo", verificaContaExistenteCPF, (request, response) => {
    const { cliente } = request;
    const saldo = getSaldo(cliente.extrato);
    
    return response.json(saldo);
});





// Servidor
app.listen(port, () => {
    console.log(` http://localhost:${port}`);
  });
  

  // https://colorful-mine-d67.notion.site/Primeiro-projeto-com-NodeJS-bc01aec5e11f49ceba68ac6e233252dd