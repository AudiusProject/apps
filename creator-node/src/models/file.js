'use strict'

module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File', {
    fileUUID: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    cnodeUserUUID: {
      type: DataTypes.UUID,
      allowNull: false
    },
    // only non-null for track files (as opposed to image/metadata files)
    trackUUID: {
      type: DataTypes.UUID,
      allowNull: true // `true` as we use File entries for more than just uploaded tracks
    },
    multihash: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // only non-null for track files (as opposed to image/metadata files)
    // contains original track file name (meaning all track segment Files will contain same track sourceFile)
    sourceFile: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    storagePath: { // format: '/file_storage/__multihash__
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(16),
      allowNull: true,
      validate: {
        isIn: [['track', 'metadata', 'image', 'dir', 'copy320']]
      }
    }
  }, {})

  File.associate = function (models) {
    File.belongsTo(models.CNodeUser, {
      foreignKey: 'cnodeUserUUID',
      sourceKey: 'cnodeUserUUID',
      onDelete: 'RESTRICT'
    })
    File.belongsTo(models.Track, {
      foreignKey: 'trackUUID',
      sourceKey: 'trackUUID',
      onDelete: 'RESTRICT'
    })
  }

  return File
}
