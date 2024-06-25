"use strict";

const { Group } = require("../models");

let options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA; // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */
    await Group.bulkCreate(
      [
        {
          organizerId: 1,
          name: "First Group",
          about: "this group is a group about a group that does the group",
          type: "In person",
          private: true,
          city: "Atlanta",
          state: "GA",
          numMembers: 1,
        },
        {
          organizerId: 2,
          name: "Second Group",
          about: "this group is a group about a group that does the group",
          type: "In person",
          private: true,
          city: "Atlanta",
          state: "GA",
          numMembers: 1,
        },
        {
          organizerId: 3,
          name: "Third Group",
          about: "this group is a group about a group that does the group",
          type: "In person",
          private: true,
          city: "Atlanta",
          state: "GA",
          numMembers: 1,
        },
        {
          organizerId: 4,
          name: "Fourth Group",
          about: "this group is a group about a group that does the group",
          type: "In person",
          private: true,
          city: "Atlanta",
          state: "GA",
          numMembers: 1,
        },
      ],
      { validate: true }
    );
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "Groups";
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(
      options,
      {
        name: {
          [Op.in]: [
            "First Group",
            "Second Group",
            "Third Group",
            "Fourth Group",
          ],
        },
      },
      {}
    );
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
