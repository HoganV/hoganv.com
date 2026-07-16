(() => {
    "use strict";

    const settings = {
        cellSize: 11,
        generationsPerSecond: 6,

        minimumInitialDensity: 0.1,
        maximumInitialDensity: 0.2,

        cellColor: "rgba(0, 93, 145, 0.13)",
        gridColor: "rgba(0, 93, 145, 0.018)",

        minimumPopulationRatio: 0.003,
        maximumPopulationRatio: 0.55,

        stagnantGenerationLimit: 4
    };

    const canvas = document.createElement("canvas");

    canvas.id = "life-background";
    canvas.setAttribute("aria-hidden", "true");
    
    Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        display: "block",
        width: "100vw",
        height: "100vh",
        margin: "0",
        padding: "0",
        zIndex: "0",
        pointerEvents: "none"
    });

    document.body.prepend(canvas);

    const context = canvas.getContext("2d", {
        alpha: true
    });

    if (!context) {
        console.error("Unable to create the Game of Life canvas context.");
        return;
    }

    let columns = 0;
    let rows = 0;

    let currentGeneration = new Uint8Array();
    let nextGeneration = new Uint8Array();

    let animationFrameId = null;
    let lastGenerationTime = 0;
    let stagnantGenerationCount = 0;
    let resizeTimer = null;

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    function getRandomInitialDensity() {
        const densityRange =
            settings.maximumInitialDensity -
            settings.minimumInitialDensity;

        return (
            settings.minimumInitialDensity +
            Math.random() * densityRange
        );
    }

    function initializeLife() {
        const viewportWidth =
            document.documentElement.clientWidth || window.innerWidth;
        
        const viewportHeight =
            document.documentElement.clientHeight || window.innerHeight;
        const pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        canvas.width = Math.floor(viewportWidth * pixelRatio);
        canvas.height = Math.floor(viewportHeight * pixelRatio);

        context.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
        );

        columns = Math.ceil(
            viewportWidth / settings.cellSize
        );

        rows = Math.ceil(
            viewportHeight / settings.cellSize
        );

        currentGeneration = new Uint8Array(
            columns * rows
        );

        nextGeneration = new Uint8Array(
            columns * rows
        );

        seedLife();
        drawLife();

        lastGenerationTime = performance.now();
        stagnantGenerationCount = 0;
    }

    function seedLife() {
        const density = getRandomInitialDensity();

        for (
            let index = 0;
            index < currentGeneration.length;
            index++
        ) {
            currentGeneration[index] =
                Math.random() < density ? 1 : 0;
        }

        addRandomClusters();
    }

    function addRandomClusters() {
        const clusterCount = Math.max(
            3,
            Math.floor((columns * rows) / 4000)
        );

        for (
            let clusterIndex = 0;
            clusterIndex < clusterCount;
            clusterIndex++
        ) {
            const centerColumn = Math.floor(
                Math.random() * columns
            );

            const centerRow = Math.floor(
                Math.random() * rows
            );

            const radius =
                2 + Math.floor(Math.random() * 5);

            for (
                let rowOffset = -radius;
                rowOffset <= radius;
                rowOffset++
            ) {
                for (
                    let columnOffset = -radius;
                    columnOffset <= radius;
                    columnOffset++
                ) {
                    if (Math.random() > 0.55) {
                        continue;
                    }

                    const column =
                        (
                            centerColumn +
                            columnOffset +
                            columns
                        ) % columns;

                    const row =
                        (
                            centerRow +
                            rowOffset +
                            rows
                        ) % rows;

                    currentGeneration[
                        row * columns + column
                    ] = 1;
                }
            }
        }
    }

    function countNeighbors(column, row) {
        let neighborCount = 0;

        for (
            let rowOffset = -1;
            rowOffset <= 1;
            rowOffset++
        ) {
            for (
                let columnOffset = -1;
                columnOffset <= 1;
                columnOffset++
            ) {
                if (
                    columnOffset === 0 &&
                    rowOffset === 0
                ) {
                    continue;
                }

                const neighborColumn =
                    (
                        column +
                        columnOffset +
                        columns
                    ) % columns;

                const neighborRow =
                    (
                        row +
                        rowOffset +
                        rows
                    ) % rows;

                neighborCount += currentGeneration[
                    neighborRow * columns +
                    neighborColumn
                ];
            }
        }

        return neighborCount;
    }

    function calculateNextGeneration() {
        let population = 0;
        let changedCellCount = 0;

        for (let row = 0; row < rows; row++) {
            for (
                let column = 0;
                column < columns;
                column++
            ) {
                const index =
                    row * columns + column;

                const isAlive =
                    currentGeneration[index] === 1;

                const neighborCount =
                    countNeighbors(column, row);

                let willLive = 0;

                if (
                    isAlive &&
                    (
                        neighborCount === 2 ||
                        neighborCount === 3
                    )
                ) {
                    willLive = 1;
                } else if (
                    !isAlive &&
                    neighborCount === 3
                ) {
                    willLive = 1;
                }

                nextGeneration[index] = willLive;
                population += willLive;

                if (
                    willLive !==
                    currentGeneration[index]
                ) {
                    changedCellCount++;
                }
            }
        }

        const previousGeneration =
            currentGeneration;

        currentGeneration =
            nextGeneration;

        nextGeneration =
            previousGeneration;

        if (changedCellCount === 0) {
            stagnantGenerationCount++;
        } else {
            stagnantGenerationCount = 0;
        }

        const populationRatio =
            population /
            currentGeneration.length;

        const shouldReseed =
            populationRatio <
                settings.minimumPopulationRatio ||
            populationRatio >
                settings.maximumPopulationRatio ||
            stagnantGenerationCount >=
                settings.stagnantGenerationLimit;

        if (shouldReseed) {
            seedLife();
            stagnantGenerationCount = 0;
        }
    }

    function drawGrid() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        context.beginPath();
        context.strokeStyle = settings.gridColor;
        context.lineWidth = 1;

        for (
            let x = 0;
            x <= viewportWidth;
            x += settings.cellSize
        ) {
            context.moveTo(x + 0.5, 0);
            context.lineTo(
                x + 0.5,
                viewportHeight
            );
        }

        for (
            let y = 0;
            y <= viewportHeight;
            y += settings.cellSize
        ) {
            context.moveTo(0, y + 0.5);
            context.lineTo(
                viewportWidth,
                y + 0.5
            );
        }

        context.stroke();
    }

    function drawLife() {
        context.clearRect(
            0,
            0,
            window.innerWidth,
            window.innerHeight
        );

        drawGrid();

        context.fillStyle =
            settings.cellColor;

        const cellInset = 1;

        const drawnCellSize = Math.max(
            1,
            settings.cellSize -
                cellInset * 2
        );

        for (let row = 0; row < rows; row++) {
            for (
                let column = 0;
                column < columns;
                column++
            ) {
                const index =
                    row * columns + column;

                if (
                    currentGeneration[index] === 0
                ) {
                    continue;
                }

                context.fillRect(
                    column *
                        settings.cellSize +
                        cellInset,
                    row *
                        settings.cellSize +
                        cellInset,
                    drawnCellSize,
                    drawnCellSize
                );
            }
        }
    }

    function animateLife(timestamp) {
        const generationInterval =
            1000 /
            settings.generationsPerSecond;

        if (
            timestamp -
                lastGenerationTime >=
            generationInterval
        ) {
            calculateNextGeneration();
            drawLife();

            lastGenerationTime = timestamp;
        }

        animationFrameId =
            requestAnimationFrame(
                animateLife
            );
    }

    function stopLifeAnimation() {
        if (animationFrameId === null) {
            return;
        }

        cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId = null;
    }

    function startLifeAnimation() {
        stopLifeAnimation();

        if (reducedMotionQuery.matches) {
            drawLife();
            return;
        }

        lastGenerationTime =
            performance.now();

        animationFrameId =
            requestAnimationFrame(
                animateLife
            );
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            stopLifeAnimation();
        } else {
            startLifeAnimation();
        }
    }

    function handleResize() {
        window.clearTimeout(resizeTimer);

        resizeTimer = window.setTimeout(
            () => {
                initializeLife();
                startLifeAnimation();
            },
            150
        );
    }

    window.addEventListener(
        "resize",
        handleResize
    );

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    if (
        typeof reducedMotionQuery
            .addEventListener === "function"
    ) {
        reducedMotionQuery.addEventListener(
            "change",
            startLifeAnimation
        );
    } else {
        reducedMotionQuery.addListener(
            startLifeAnimation
        );
    }

    initializeLife();
    startLifeAnimation();
})();
