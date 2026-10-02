/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // Достаем данные, после чего у нас появляются три переменные: discount, sale_price, quantity
    const { discount, sale_price, quantity } = purchase;
    // discountCoefficient - коэффициент, который показывает, какая часть стоимости останется после скидки
    const discountCoefficient = 1 - (discount / 100);
    // Расчет выручки от операции
    return sale_price * quantity * discountCoefficient;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // Расчет бонуса от позиции в рейтинге
    const { profit } = seller; 
    
    if (index === 0) { 
        return profit * 0.15; // 15%
    } else if (index === 1 || index === 2) { 
        return profit * 0.10; // 10%
    } else if (index === total - 1) { 
        return 0; // 0%
    } else { 
        return profit * 0.05; // 5%
    } 
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверяем входные данные
    if ( 
        !data 
        || !Array.isArray(data.sellers) 
        || !Array.isArray(data.products) 
        || !Array.isArray(data.purchase_records) 
        || data.sellers.length === 0 
        || data.products.length === 0 
        || data.purchase_records.length === 0 
    ) { 
        throw new Error('Некорректные входные данные'); 
    }
    // Получаем функции из options 
    const { calculateRevenue, calculateBonus } = options || {};

    // Проверка наличия функций (опций)
    if ( 
        typeof calculateRevenue !== 'function' 
        || typeof calculateBonus !== 'function' 
    ) { 
        throw new Error('Не переданы функции для расчёта'); 
    }

    // Подготовка промежуточных данных для сбора статистики
    // Создаём промежуточную статистику для каждого продавца 
    const sellerStats = data.sellers.map(seller => ({ 
        id: seller.id, 
        name: `${seller.first_name} ${seller.last_name}`, 
        revenue: 0, profit: 0, 
        sales_count: 0, 
        products_sold: {}, 
    }));

    // Индексация продавцов и товаров для быстрого доступа
    // Создаём индекс продавцов 
    const sellerIndex = {}; 

    sellerStats.forEach(seller => { 
        sellerIndex[seller.id] = seller; 
    }); 
    // Создаём индекс товаров 
    const productIndex = {}; 

    data.products.forEach(product => { 
        productIndex[product.sku] = product; 
    });

    // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Перебираем все чеки
        const seller = sellerIndex[record.seller_id]; // Находим продавца этого чека
        seller.sales_count += 1; // Увеличиваем количество продаж
        seller.revenue += record.total_amount; // Добавляем выручку по чеку
        // Перебираем товары внутри чека 
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Находим товар
            const cost = product.purchase_price * item.quantity; // Себестоимость товара
            const revenue = calculateRevenue(item, product); // Выручка с учётом скидки
            const profit = revenue - cost; // Прибыль
            seller.profit += profit; // Добавляем прибыль продавцу

            // Если такого товара ещё нет в статистике 
            if (!seller.products_sold[item.sku]) { 
                seller.products_sold[item.sku] = 0; 
            } 
            // Увеличиваем количество проданных товаров 
            seller.products_sold[item.sku] += item.quantity; 
        }); 
    });

    // Сортировка продавцов по прибыли от большей к меньшей
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий на основе ранжирования. Назначаем бонусы и формируем топ-10 товаров
    sellerStats.forEach((seller, index) => { 
        // Рассчитываем бонус 
        seller.bonus = calculateBonus( 
            index, 
            sellerStats.length, 
            seller 
        ); 
        // Формируем топ-10 товаров 
        seller.top_products = Object.entries(seller.products_sold) 
            .map(([sku, quantity]) => ({ 
                sku, 
                quantity, 
            })) 
            .sort((a, b) => b.quantity - a.quantity) 
            .slice(0, 10); 
        });

    // Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({ 
        seller_id: seller.id, 
        name: seller.name, 
        revenue: +seller.revenue.toFixed(2), 
        profit: +seller.profit.toFixed(2), 
        sales_count: seller.sales_count, 
        top_products: seller.top_products, 
        bonus: +seller.bonus.toFixed(2), 
    })); 
}
