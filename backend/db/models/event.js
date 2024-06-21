"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Event.belongsTo(models.Group, {
        foreignKey: "groupId",
      });
      Event.belongsTo(models.Venue, {
        foreignKey: "venueId",
      });
    }
  }
  Event.init(
    {
      groupId: { type: DataTypes.INTEGER, allowNull: false },
      venueId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false },
      startDate: { type: DataTypes.DATE, allowNull: false },
      endDate: { type: DataTypes.DATE, allowNull: false },
      previewImage: { type: DataTypes.STRING, allowNull: true },
    },
    {
      sequelize,
      modelName: "Event",
    }
  );
  return Event;
};
