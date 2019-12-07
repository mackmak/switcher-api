import mongoose from 'mongoose';
import moment from 'moment';
import IPCIDR from 'ip-cidr';

export const StrategiesType = Object.freeze({
    NETWORK: 'NETWORK_VALIDATION',
    VALUE: 'VALUE_VALIDATION',
    TIME: 'TIME_VALIDATION',
    DATE: 'DATE_VALIDATION'
  });

export const OperationsType = Object.freeze({
    EQUAL: 'EQUAL',
    NOT_EQUAL: 'NOT_EQUAL',
    EXIST: 'EXIST',
    NOT_EXIST: 'NOT_EXIST',
    GREATER: 'GREATER',
    LOWER: 'LOWER',
    BETWEEN: 'BETWEEN'
  });

const OperationPerStrategy = [
    {
        strategy: StrategiesType.NETWORK,
        operations: [OperationsType.EXIST, OperationsType.NOT_EXIST]
    },
    {
        strategy: StrategiesType.VALUE,
        operations: [OperationsType.EXIST, OperationsType.NOT_EXIST, OperationsType.EQUAL, OperationsType.NOT_EQUAL]
    },
    {
        strategy: StrategiesType.TIME,
        operations: [OperationsType.BETWEEN, OperationsType.LOWER, OperationsType.GREATER]
    },
    {
        strategy: StrategiesType.DATE,
        operations: [OperationsType.BETWEEN, OperationsType.LOWER, OperationsType.GREATER]
    }
]

const OperationValuesValidation = [
    {
        operation: OperationsType.EQUAL,
        min: 1,
        max: 1
    },
    {
        operation: OperationsType.NOT_EQUAL,
        min: 1,
        max: 1
    },
    {
        operation: OperationsType.EXIST,
        min: 1,
        max: process.env.MAX_EXIST_STRATEGYOPERATION
    },
    {
        operation: OperationsType.NOT_EXIST,
        min: 1,
        max: process.env.MAX_EXIST_STRATEGYOPERATION
    },
    {
        operation: OperationsType.GREATER,
        min: 1,
        max: 1
    },
    {
        operation: OperationsType.LOWER,
        min: 1,
        max: 1
    },
    {
        operation: OperationsType.BETWEEN,
        min: 2,
        max: 2
    }
]

export const strategyRequirements = (strategy, res) => {
    const foundStrategy = Object.values(StrategiesType).find(element => element === strategy)

    if (!foundStrategy) {
        return res.status(404)
            .send({
                error: `Strategy '${strategy}' not found`,
                tip: `You might want one of these: ${Object.values(StrategiesType)}`
        })
    }

    const operationsAvailable = OperationPerStrategy.find(element => element.strategy === foundStrategy).operations

    let operationRequirements = []
    operationsAvailable.forEach((o) => {
        operationRequirements.push(OperationValuesValidation.find(element => element.operation === o))
    })

    return {
        strategy,
        operationsAvailable,
        operationRequirements
    }
}

export const processOperation = (strategy, operation, input, values) => {
    switch(strategy) {
        case StrategiesType.NETWORK:
            return processNETWORK(operation, input, values)
        case StrategiesType.VALUE:
            return processVALUE(operation, input, values)
        case StrategiesType.TIME:
            return processTime(operation, input, values)
        case StrategiesType.DATE:
            return processDate(operation, input, values)
    }
}

const processNETWORK = async (operation, input, values) => {

    const cidrRegex = '^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))$'
    
    switch(operation) {
        case OperationsType.EXIST:
            for (var i = 0; i < values.length; i++) {
                if (values[i].match(cidrRegex)) {
                    const cidr = new IPCIDR(values[i]);
                    if (cidr.contains(input)) {
                        return true
                    }
                } else {
                    return values.includes(input)
                }
            }
            break;
        case OperationsType.NOT_EXIST:
            const result = values.filter(element => {
                if (element.match(cidrRegex)) {
                    const cidr = new IPCIDR(element);
                    if (cidr.contains(input)) {
                        return true
                    }
                } else {
                    return values.includes(input)
                }
            })
            return result.length === 0
    }

    return false
}

const processVALUE = (operation, input, values) => {
    switch(operation) {
        case OperationsType.EXIST:
            const found = values.find((element) => element === input)
            return found ? true : false
        case OperationsType.NOT_EXIST:
            return !processVALUE(OperationsType.EXIST, input, values);
        case OperationsType.EQUAL:
            return input === values[0]
        case OperationsType.NOT_EQUAL:
            return !processVALUE(OperationsType.EQUAL, input, values);
    }
}

const processTime = (operation, input, values) => {
    const today = moment().format('YYYY-MM-DD')

    switch(operation) {
        case OperationsType.LOWER:
            return moment(`${today}T${input}`).isSameOrBefore(`${today}T${values[0]}`)
        case OperationsType.GREATER:
            return moment(`${today}T${input}`).isSameOrAfter(`${today}T${values[0]}`)
        case OperationsType.BETWEEN:
            return moment(`${today}T${input}`).isBetween(`${today}T${values[0]}`, `${today}T${values[1]}`)
    }
}

const processDate = (operation, input, values) => {
    switch(operation) {
        case OperationsType.LOWER:
            return moment(input).isSameOrBefore(values[0])
        case OperationsType.GREATER:
            return moment(input).isSameOrAfter(values[0])
        case OperationsType.BETWEEN:
            return moment(input).isBetween(values[0], values[1])
    }
}

const existStrategy = async (strategyConfig) => {
    if (strategyConfig.__v === undefined) {
        const foundStrategy = await ConfigStrategy.find({ config: strategyConfig.config, strategy: strategyConfig.strategy })
        return foundStrategy.length > 0
    }
    return false
}

const configStrategySchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    activated: {
        type: Map,
        of: Boolean,
        required: true
    },
    strategy: {
        type: String,
        enum: Object.values(StrategiesType),
        required: true
    },
    values: [{
        type: String,
        require: true,
        trim: true
    }],
    operation: {
        type: String,
        enum: Object.values(OperationsType),
        require: true
    },
    config: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Config'
    },
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Domain'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    }
}, {
    timestamps: true
})

configStrategySchema.pre('save', async function (next) {
    const strategyConfig = this

    const strategy = strategyConfig.strategy
    const operationStrategy = strategyConfig.operation
    const { min, max } = OperationValuesValidation.filter(element => element.operation === operationStrategy)[0]

    if (await existStrategy(strategyConfig)) {
        const err = new Error(`Unable to complete the operation. Strategy '${strategy}' already exist for this configuration`)
        next(err);
    }

    if (!strategyConfig.values || strategyConfig.values.length < min || strategyConfig.values.length > max) {
        const err =  new Error(`Unable to complete the operation. The number of values for the operation '${operationStrategy}', are min: ${min} and max: ${max} values`)
        next(err);
    }

    const operations = OperationPerStrategy.find(element => element.strategy === strategy).operations
    const foundOperation = operations.filter((element) => element === operationStrategy)

    if (!foundOperation) {
        const err =  new Error(`Unable to complete the operation. The strategy '${strategy}' needs ${operations} as operation`)
        next(err);
    }

    next()
})

Object.assign(configStrategySchema.statics, { StrategiesType, OperationsType });

export const ConfigStrategy = mongoose.model('ConfigStrategy', configStrategySchema)