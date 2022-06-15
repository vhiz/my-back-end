import ShortId from "shortid";

export type GenerateShortIdLength = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
export const generateShortId = (length?: GenerateShortIdLength) => {
    length = length ? length : 10;
    if (!Number.isInteger(length) || length < 5 || length > 16) {
        return "";
    }

    let id = `${ShortId.generate()}${ShortId.generate()}`;
    if (length > 10) {
        id = `${id}${ShortId.generate()}`;
    }
    id = id.replace(/-|_/g, "");

    return id.slice(0, length);
};
