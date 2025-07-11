/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src", "<rootDir>/test"],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testRegex: "(./test/.*|(\\.|/)(test|spec))\\.tsx?$",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
}
