const mongoose = require('mongoose');
const PlantaSchema = mongoose.Schema(
    { nombre: {
        type:String,
        required: [true,'El nombre es obligatorio']
    },
    imagen: {
        type:String
    },
    categoria: {
        type:String,
        required: [true,'La categoria es obligatoria']
    },
    precio: {
        type:Number
    }
}
)
//sobreescribimos un método del Schema para modificar el objeto que exporta
PlantaSchema.methods.toJSON = function() {
    const { _id,...planta} = this.toObject() ;
    planta.id=_id;
    return planta;
}

let Planta = mongoose.model('Planta',PlantaSchema);
module.exports = Planta;