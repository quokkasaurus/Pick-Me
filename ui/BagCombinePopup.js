// BagCombinePopup.js
import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.esm.js';

export default class BagCombinePopup {
    constructor(scene) {
        this.scene = scene;

        this.container = null;

        this.popupWidth = 620;
        this.popupHeight = 730;

        this.scrollContainer = null;
        this.itemsContainer = null;
        this.scrollMaskGraphics = null;
        this.scrollMask = null;
        this.scrollHit = null;

        this.scrollMinY = 0;
        this.scrollMaxY = 0;

        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartContainerY = 0;
        this.wheelHandler = null;

        this.isOpen = false;

        this.selectedItem = null; // which gacha is selected

        this.completeContainer = null;
        this.completeOverlay = null;
    }

    createPopup() {
        const scene = this.scene;
        const cam = scene.cameras.main;
        const centerX = cam.centerX;
        const centerY = cam.centerY;

        this.container = scene.add.container(0, 0);
        this.container.setDepth(5000);
        this.container.setVisible(false);

        const overlay = scene.add.rectangle(
            centerX,
            centerY,
            cam.width,
            cam.height,
            0x000000,
            0.6
        ).setInteractive();

        const bg = scene.add.image(centerX, centerY, 'bag_combine_popup')
            .setDisplaySize(this.popupWidth, this.popupHeight);

        // two big circles
        const circlesY = centerY - this.popupHeight / 2 + 190;
        const circleGap = 5;
        const circleSize = 200;

        const leftCircleX = centerX - circleGap - circleSize / 2;
        const rightCircleX = centerX + circleGap + circleSize / 2;

        const leftCircle = scene.add.image(leftCircleX, circlesY, 'bag_combine_circle')
            .setDisplaySize(circleSize, circleSize);
        const rightCircle = scene.add.image(rightCircleX, circlesY, 'bag_combine_circle')
            .setDisplaySize(circleSize, circleSize);

        const pentagonScale = 1.2;
        const leftPentagon = scene.add.image(leftCircleX, circlesY, 'bag_combine_pentagon')
            .setScale(pentagonScale);
        const rightPentagon = scene.add.image(rightCircleX, circlesY, 'bag_combine_pentagon')
            .setScale(pentagonScale);

        // guide text
        const labelText = scene.add.text(
            centerX,
            circlesY + circleSize / 2 + 20,
            '합체 하고 싶은 가차를 선택하세요',
            {
                fontFamily: 'dovemayo',
                fontSize: '18px',
                color: '#000000',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5);

        // scrollable item area
        this.createScrollableGrid(centerX, centerY + 110);

        // bottom buttons
        const closeBtn = scene.add.image(
            centerX - this.popupWidth / 2 + 40,
            centerY + this.popupHeight / 2 - 40,
            'exit_button'
        ).setDisplaySize(48, 48)
            .setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => this.hide());

        const combineBtn = scene.add.image(
            centerX + this.popupWidth / 2 - 140,
            centerY + this.popupHeight / 2 - 40,
            'bag_combine_button'
        ).setScale(1.2)
            .setInteractive({ useHandCursor: true });

        combineBtn.on('pointerdown', () => {
            console.log('combine clicked, selectedItem =', this.selectedItem);
            if (this.completeContainer) {
                this.completeContainer.setVisible(true);
            }
        });

        // --- combine complete popup
        this.completeContainer = scene.add.container(0, 0);
        this.completeContainer.setVisible(false);

        // dark background just for this popup
        this.completeOverlay = scene.add.rectangle(
            centerX,
            centerY,
            cam.width,
            cam.height,
            0x000000,
            0.7
        ).setInteractive();

        // close when clicking anywhere on this overlay
        this.completeOverlay.on('pointerdown', () => {
            this.completeContainer.setVisible(false);
        });

        const completeBg = scene.add.image(centerX, centerY, 'bag_combine_complete')
            .setScale(1.2);

        // show the combined item on top of the bg
        const resultItem = scene.add.image(centerX, centerY, 'GachaResult')
            .setScale(2.0);

        this.completeContainer.add([
            this.completeOverlay,
            completeBg,
            resultItem
        ]);

        this.container.add([
            overlay,
            bg,
            leftCircle,
            rightCircle,
            leftPentagon,
            rightPentagon,
            labelText,
            this.scrollMaskGraphics,
            this.scrollContainer,
            closeBtn,
            combineBtn,
            this.completeContainer
        ]);
    }

    createScrollableGrid(centerX, centerY) {
        const scene = this.scene;

        const viewportWidth = 550;
        const viewportHeight = 300;

        const viewportX = centerX;
        const viewportY = centerY;

        const viewportLeft = viewportX - viewportWidth / 2;
        const viewportTop = viewportY - viewportHeight / 2;

        this.scrollContainer = scene.add.container(0, 0);
        this.itemsContainer = scene.add.container(0, 0);

        // mask
        this.scrollMaskGraphics = scene.add.graphics();
        this.scrollMaskGraphics.fillStyle(0xffffff, 1);
        this.scrollMaskGraphics.fillRect(
            viewportLeft,
            viewportTop,
            viewportWidth,
            viewportHeight
        );
        this.scrollMask = this.scrollMaskGraphics.createGeometryMask();
        this.scrollContainer.setMask(this.scrollMask);

        this.scrollHit = scene.add.rectangle(
            viewportX,
            viewportY,
            viewportWidth,
            viewportHeight,
            0x000000,
            0
        ).setInteractive();

        this.scrollContainer.add(this.scrollHit);
        this.scrollContainer.add(this.itemsContainer);

        // grid: 5 columns, N rows
        const cols = 5;
        const rows = 10; // example; replace with your actual count / computed
        const itemGapX = 10;
        const itemGapY = 14;
        const itemScale = 0.9;

        const sample = scene.add.image(0, 0, 'GachaResult').setScale(itemScale);
        const itemW = sample.displayWidth;
        const itemH = sample.displayHeight;
        sample.destroy();

        const startX = centerX - ((cols - 1) * (itemW + itemGapX)) / 2;
        const startY = viewportTop + itemH / 2 + 6;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * (itemW + itemGapX);
                const y = startY + row * (itemH + itemGapY);

                const item = scene.add.image(x, y, 'GachaResult').setScale(itemScale);
                item.setInteractive({ useHandCursor: true });

                // example metadata; hook up with your real data
                item.itemId = row * cols + col;

                item.on('pointerdown', () => {
                    this.selectedItem = item;
                    // optional: add a highlight frame
                });

                this.itemsContainer.add(item);
            }
        }

        const contentHeight = rows * (itemH + itemGapY) - itemGapY + 12;
        const maxScroll = Math.max(0, contentHeight - viewportHeight);
        this.scrollMaxY = 0;
        this.scrollMinY = -maxScroll;
        this.setScrollY(0);

        // drag scrolling
        this.scrollHit.on('pointerdown', (pointer) => {
            this.isDragging = true;
            this.dragStartY = pointer.y;
            this.dragStartContainerY = this.itemsContainer.y;
        });

        scene.input.on('pointerup', () => {
            this.isDragging = false;
        });

        scene.input.on('pointermove', (pointer) => {
            if (!this.isDragging || !this.isOpen) return;
            this.setScrollY(this.dragStartContainerY + (pointer.y - this.dragStartY));
        });

        // wheel scroll
        if (!this.wheelHandler) {
            this.wheelHandler = (pointer, gameObjects, dx, dy) => {
                if (!this.isOpen) return;
                if (
                    pointer.x < viewportLeft ||
                    pointer.x > viewportLeft + viewportWidth ||
                    pointer.y < viewportTop ||
                    pointer.y > viewportTop + viewportHeight
                ) return;

                this.setScrollY(this.itemsContainer.y - dy * 0.5);
            };
            scene.input.on('wheel', this.wheelHandler);
        }
    }

    setScrollY(y) {
        this.itemsContainer.y = Phaser.Math.Clamp(y, this.scrollMinY, this.scrollMaxY);
    }

    show() {
        if (!this.container) this.createPopup();
        this.container.setVisible(true);
        this.isOpen = true;
    }

    hide() {
        if (!this.container) return;
        this.container.setVisible(false);
        this.isOpen = false;
        this.isDragging = false;
        if (this.completeContainer) {
            this.completeContainer.setVisible(false);
        }
    }

    destroy() {
        if (this.wheelHandler) {
            this.scene.input.off('wheel', this.wheelHandler);
            this.wheelHandler = null;
        }
        if (this.container) {
            this.container.destroy(true);
            this.container = null;
            this.scrollContainer = null;
            this.itemsContainer = null;
            this.scrollMaskGraphics = null;
            this.scrollMask = null;
            this.scrollHit = null;
        }
    }
}