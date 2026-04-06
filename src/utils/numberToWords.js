const defaultNumbers = ' không một hai ba bốn năm sáu bảy tám chín';

const units = (number, readFull) => {
    let result = '';
    const hundred = Math.floor(number / 100);
    const ten = Math.floor((number % 100) / 10);
    const unit = number % 10;

    if (readFull || hundred > 0) {
        result = ` ${defaultNumbers.split(' ')[hundred + 1]} trăm`;
        result += tenToWords(ten, unit);
    } else {
        result = tenToWords(ten, unit);
    }

    return result;
};

const tenToWords = (ten, unit) => {
    let result = '';
    if (ten > 1) {
        result += ` ${defaultNumbers.split(' ')[ten + 1]} mươi`;
        if (unit === 1) result += ' mốt';
    } else if (ten === 1) {
        result += ' mười';
    } else if (unit > 0) {
        result += ' lẻ';
    }

    if (ten === 1 && unit === 5) {
        result += ' lăm';
    } else if (ten > 1 && unit === 5) {
        result += ' lăm';
    } else if (unit > 1 || (unit === 1 && ten <= 1)) {
        result += ` ${defaultNumbers.split(' ')[unit + 1]}`;
    }

    return result;
};

const blockToWords = (block, readFull) => {
    const hundred = Math.floor(block / 100);
    const ten = Math.floor((block % 100) / 10);
    const unit = block % 10;
    let result = '';

    if (readFull || hundred > 0) {
        result = ` ${defaultNumbers.split(' ')[hundred + 1]} trăm`;
        result += tenToWords(ten, unit);
    } else {
        result = tenToWords(ten, unit);
    }
    return result;
};

const numberToWords = (number) => {
    if (number === 0) return 'Không đồng';
    if (!number) return '';
    
    let str = `${Math.abs(number)}`;
    while (str.length % 3 !== 0) str = `0${str}`;
    
    const blocks = [];
    for (let i = 0; i < str.length; i += 3) {
        blocks.push(parseInt(str.substr(i, 3)));
    }

    const placeValues = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
    let result = '';

    for (let i = 0; i < blocks.length; i++) {
        const place = blocks.length - i - 1;
        if (blocks[i] > 0) {
            result += blockToWords(blocks[i], i > 0);
            result += placeValues[place];
        }
    }

    result = result.trim();
    if (result.length > 0) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    return `${result} đồng`;
};

export default numberToWords;
