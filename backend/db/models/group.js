"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Group.belongsTo(models.User, {
        foreignKey: "organizerId",
      });
      Group.hasMany(models.Group_member, {
        foreignKey: "groupId",
        onDelete: "CASCADE",
        hooks: true,
      });
      Group.belongsToMany(models.User, {
        through: models.Group_member,
        foreignKey: "groupId",
      });
    }
  }
  Group.init(
    {
      organizerId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      about: { type: DataTypes.STRING, allowNull: true },
      type: { type: DataTypes.STRING, allowNull: false },
      private: { type: DataTypes.BOOLEAN, allowNull: false },
      city: { type: DataTypes.STRING, allowNull: false },
      state: { type: DataTypes.STRING, allowNull: false },
      numMembers: { type: DataTypes.INTEGER, allowNull: false },
      previewImage: { type: DataTypes.STRING, allowNull: true },
    },
    {
      sequelize,
      modelName: "Group",
    }
  );
  return Group;
};
